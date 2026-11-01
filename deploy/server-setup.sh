#!/bin/bash
# Yangi Ubuntu 24.04 serverni Yaqin uchun tayyorlash (5.3). Root sifatida, kompyuterdan:
#
#   scp deploy/server-setup.sh root@IP:/root/
#   ssh root@IP bash /root/server-setup.sh
#
# Natija:
#   - tizim yangilangan, vaqt zonasi Asia/Tashkent, 2 GB swap;
#   - "deploy" foydalanuvchisi (sudo va docker huquqi bilan), root'ning SSH kalitlari bilan;
#   - SSH faqat kalit bilan va faqat "deploy" uchun (root va parol bilan kirish yopiq);
#   - firewall (ufw): faqat 22, 80, 443; fail2ban SSH'ni kuzatadi;
#   - xavfsizlik yangilanishlari avtomatik, kerak bo'lsa 04:00 da qayta yuklash;
#   - Docker Engine va Compose (rasmiy repo, kalit barmoq izi tekshiriladi), loglar aylantiriladi.
#
# Qayta ishga tushirish xavfsiz: keyin "deploy" bo'lib, `sudo bash server-setup.sh`.
# Maxfiy ma'lumot yo'q. CI'da systemd'li konteynerda sinaladi (.github/workflows/server-setup.yml).
set -euo pipefail

DEPLOY_USER=deploy
SWAP_SIZE=${SWAP_SIZE:-2G} # 0 — swap qo'shilmaydi (CI konteynerida swap yoqib bo'lmaydi)
TIMEZONE=Asia/Tashkent
REBOOT_TIME=04:00
DOCKER_KEY_FINGERPRINT=9DC858229FC7DD38854AE2D88D81803C0EBFCD88

log() { printf '\n==> %s\n' "$*"; }
die() {
  printf 'XATO: %s\n' "$*" >&2
  exit 1
}

[[ $EUID -eq 0 ]] || die "root sifatida ishga tushiring"
# shellcheck source=/dev/null
. /etc/os-release
[[ $ID == ubuntu && $VERSION_ID == 24.04 ]] || die "faqat Ubuntu 24.04 uchun (bu server: $PRETTY_NAME)"

# Kalitlar manbasi: root'ning yoki sudo bilan ishga tushirgan foydalanuvchining authorized_keys'i.
# Faqat kalit qatorlari olinadi — provayder qo'shgan cheklovlar (command="..." va h.k.) o'tmaydi.
source_home=/root
if [[ -n ${SUDO_USER:-} && $SUDO_USER != root ]]; then
  source_home=$(getent passwd "$SUDO_USER" | cut -d: -f6)
fi
keys=$(grep -oE '(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp[0-9]+|sk-[a-z0-9.@-]+) [A-Za-z0-9+/=]+( .*)?$' \
  "$source_home/.ssh/authorized_keys" 2>/dev/null || true)
[[ -n $keys ]] || die "$source_home/.ssh/authorized_keys da SSH kalit yo'q — SSH yopilsa serverga kirib bo'lmaydi"

export DEBIAN_FRONTEND=noninteractive
apt_get() { apt-get -y -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold "$@"; }

log "Tizim yangilanmoqda"
apt-get update
apt_get full-upgrade
apt_get install ca-certificates curl gnupg tzdata ufw fail2ban python3-systemd unattended-upgrades

log "Vaqt zonasi: $TIMEZONE"
ln -sf "/usr/share/zoneinfo/$TIMEZONE" /etc/localtime
echo "$TIMEZONE" >/etc/timezone

if [[ $SWAP_SIZE != 0 ]]; then
  log "Swap: $SWAP_SIZE"
  if [[ ! -f /swapfile ]]; then
    fallocate -l "$SWAP_SIZE" /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
  fi
  swapon --show=NAME --noheadings | grep -qx /swapfile || swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >>/etc/fstab
  # Swap — faqat zaxira: xotira tugaganda konteynerlar o'ldirilmasin, lekin oddiy ishda ishlatilmasin
  echo 'vm.swappiness=10' >/etc/sysctl.d/90-yaqin-swap.conf
  sysctl -q -p /etc/sysctl.d/90-yaqin-swap.conf
fi

log "Foydalanuvchi: $DEPLOY_USER"
if ! id "$DEPLOY_USER" &>/dev/null; then
  useradd --create-home --shell /bin/bash "$DEPLOY_USER"
fi
# Parol yo'q ('*' — parol bilan kirib bo'lmaydi, kalit bilan bo'ladi)
usermod -p '*' "$DEPLOY_USER"
deploy_home=$(getent passwd "$DEPLOY_USER" | cut -d: -f6)
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$deploy_home/.ssh"
if [[ ! -s $deploy_home/.ssh/authorized_keys ]]; then
  printf '%s\n' "$keys" >"$deploy_home/.ssh/authorized_keys"
fi
chown "$DEPLOY_USER:$DEPLOY_USER" "$deploy_home/.ssh/authorized_keys"
chmod 600 "$deploy_home/.ssh/authorized_keys"
# Parolsiz sudo: parol umuman yo'q, docker guruhi baribir root'ga teng — kirish faqat kalit bilan
echo "$DEPLOY_USER ALL=(ALL) NOPASSWD:ALL" >/etc/sudoers.d/90-yaqin-deploy
chmod 440 /etc/sudoers.d/90-yaqin-deploy
visudo -cqf /etc/sudoers.d/90-yaqin-deploy

log "Docker"
install -d -m 755 /etc/apt/keyrings /etc/docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
fingerprint=$(gpg --show-keys --with-colons /etc/apt/keyrings/docker.asc | awk -F: '$1 == "fpr" && !seen {print $10; seen = 1}')
[[ $fingerprint == "$DOCKER_KEY_FINGERPRINT" ]] || die "Docker kaliti barmoq izi mos emas: $fingerprint"
cat >/etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $VERSION_CODENAME
Components: stable
Signed-By: /etc/apt/keyrings/docker.asc
EOF
# Loglar diskni to'ldirmasin: siqilgan, konteyner boshiga ko'pi bilan 5 × 20 MB
cat >/etc/docker/daemon.json <<'EOF'
{
  "log-driver": "local",
  "log-opts": { "max-size": "20m", "max-file": "5" }
}
EOF
apt-get update
apt_get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
usermod -aG docker "$DEPLOY_USER"

log "Firewall (ufw): 22, 80, 443"
# Eslatma: Docker ochgan portlar ufw'dan o'tib ketadi — compose faqat 80 va 443 ni ochadi (Caddy)
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

log "fail2ban: SSH"
cat >/etc/fail2ban/jail.d/90-yaqin.conf <<'EOF'
[sshd]
enabled = true
backend = systemd
maxretry = 5
findtime = 10m
bantime = 1h
EOF
systemctl enable fail2ban
systemctl restart fail2ban

log "Avtomatik xavfsizlik yangilanishlari (qayta yuklash — $REBOOT_TIME)"
cat >/etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF
# Konteynerlar qayta yuklashdan keyin o'zi turadi (compose: restart: unless-stopped)
cat >/etc/apt/apt.conf.d/52yaqin-unattended <<EOF
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "$REBOOT_TIME";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
EOF

log "SSH: faqat kalit bilan, faqat $DEPLOY_USER"
# 00- — Ubuntu'da birinchi qiymat amal qiladi, provayderning 50-cloud-init.conf'idan oldin o'qiladi
cat >/etc/ssh/sshd_config.d/00-yaqin.conf <<EOF
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
AuthenticationMethods publickey
AllowUsers $DEPLOY_USER
MaxAuthTries 3
LoginGraceTime 30
X11Forwarding no
EOF
install -d -m 755 /run/sshd # socket orqali ishga tushganda hali bo'lmasligi mumkin, sshd -t unga qaraydi
sshd -t
# Joriy ulanish uzilmaydi; ssh.service socket orqali hali ishga tushmagan bo'lsa — keyingi ulanishda yangi sozlama bilan
systemctl try-restart ssh.service

log "Natija"
echo "Vaqt: $(date '+%Y-%m-%d %H:%M %Z')"
echo "Swap: $(swapon --show=NAME,SIZE --noheadings | tr '\n' ' ')"
docker --version
docker compose version
ufw status | sed -n '1p'
sshd -T | grep -E '^(permitrootlogin|passwordauthentication|allowusers) '
fail2ban-client status sshd | grep -E 'Currently banned|Total banned' || true
echo
echo "Tayyor. Endi kompyuterdan: ssh $DEPLOY_USER@<server IP>"
echo "Shu ulanishni yopishdan oldin yangi oynada kirib ko'ring."

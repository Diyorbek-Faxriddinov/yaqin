import type { AppLocale } from "@/i18n/routing";

/**
 * Foydalanish shartlari va maxfiylik siyosati matnlari.
 * ⚠ LOYIHA: ishga tushirishdan oldin O'zbekiston qonunchiligini (xususan, "Shaxsga doir maʼlumotlar
 * to'g'risida"gi qonun) biladigan huquqshunos tekshirishi kerak. Sahifada ham shunday belgilanadi.
 * Matndagi va'dalar (masalan, saqlash muddatlari) backendda bajarilishi shart — docs/backend-handoff.md.
 */

export type LegalBlock = string | { list: string[] };
export type LegalSection = { id: string; heading: string; body: LegalBlock[] };
export type LegalDocument = {
  title: string;
  description: string;
  updated: string;
  sections: LegalSection[];
};

const UPDATED = "2026-10-26";

const terms: Record<AppLocale, LegalDocument> = {
  uz: {
    title: "Foydalanish shartlari",
    description: "Yaqin saytidan foydalanish qoidalari: maʼlumotlar, sharhlar va akkauntlar.",
    updated: UPDATED,
    sections: [
      {
        id: "xizmat",
        heading: "1. Xizmat haqida",
        body: [
          "Yaqin — Toshkentdagi doʻkonlar va xizmatlar haqida maʼlumot katalogi: manzil, ish vaqti, narxlar va sharhlar. Platforma bizneslarning oʻzi emas, buyurtma va toʻlov qabul qilmaydi.",
          "Saytdan roʻyxatdan oʻtmasdan foydalanish mumkin. Sharh qoldirish, sevimlilar va xabar yuborish uchun Telegram yoki Google orqali kirish kerak.",
        ],
      },
      {
        id: "malumotlar",
        heading: "2. Bizneslar haqidagi maʼlumotlar",
        body: [
          "Biznes maʼlumotlarini platforma jamoasi egasining roziligi bilan joyida toʻplaydi va kiritadi. Narx, ish vaqti va boshqa maʼlumotlar oʻzgarishi mumkin — ular maʼlumot uchun beriladi va kafolatlanmaydi.",
          "Notoʻgʻri maʼlumot koʻrsangiz, biznes sahifasidagi “Maʼlumot notoʻgʻrimi? Xabar bering” tugmasidan foydalaning.",
          "Biznes egasi oʻz biznesi haqidagi maʼlumotni istalgan vaqtda oʻzgartirish yoki saytdan olib tashlashni soʻrashi mumkin.",
        ],
      },
      {
        id: "sharhlar",
        heading: "3. Sharhlar qoidalari",
        body: [
          "Sharh oʻzingizning haqiqiy tajribangizga asoslangan boʻlishi kerak. Quyidagilar taqiqlanadi:",
          {
            list: [
              "haqoratli, kamsituvchi yoki tahdidli soʻzlar;",
              "reklama, boshqa bizneslar yoki saytlarga havolalar;",
              "telefon raqami va boshqa shaxsiy maʼlumotlar;",
              "soxta sharhlar, jumladan pul yoki imtiyoz evaziga yozilganlari;",
              "biznesga aloqasi boʻlmagan matn.",
            ],
          },
          "Sharhlar moderatsiyadan oʻtadi. Qoidaga zid sharh sababi koʻrsatilgan holda rad etiladi yoki keyin olib tashlanadi.",
        ],
      },
      {
        id: "akkaunt",
        heading: "4. Akkaunt",
        body: [
          "Boshqa shaxs nomidan kirish yoki bir nechta akkaunt orqali baholarni sunʼiy oshirish taqiqlanadi. Qoidalarni buzgan akkaunt bloklanishi mumkin.",
          "Akkauntingizni profil sahifasida istalgan vaqtda oʻchirishingiz mumkin.",
        ],
      },
      {
        id: "javobgarlik",
        heading: "5. Javobgarlik",
        body: [
          "Sayt “boricha” taqdim etiladi. Platforma bizneslar koʻrsatadigan xizmat va mahsulotlar sifati, narxi va bajarilishi uchun javobgar emas — bu masalalar mijoz va biznes oʻrtasida hal qilinadi.",
        ],
      },
      {
        id: "ozgarishlar",
        heading: "6. Oʻzgarishlar va qoʻllaniladigan huquq",
        body: [
          "Shartlar yangilanishi mumkin; yangilangan sana sahifa boshida koʻrsatiladi. Shartlarga Oʻzbekiston Respublikasi qonunchiligi qoʻllaniladi.",
        ],
      },
    ],
  },
  ru: {
    title: "Условия использования",
    description: "Правила использования сайта Yaqin: информация, отзывы и аккаунты.",
    updated: UPDATED,
    sections: [
      {
        id: "xizmat",
        heading: "1. О сервисе",
        body: [
          "Yaqin — каталог информации о магазинах и услугах Ташкента: адрес, часы работы, цены и отзывы. Платформа не является самими бизнесами и не принимает заказы и оплату.",
          "Пользоваться сайтом можно без регистрации. Для отзывов, избранного и сообщений нужен вход через Telegram или Google.",
        ],
      },
      {
        id: "malumotlar",
        heading: "2. Информация о бизнесах",
        body: [
          "Информацию о бизнесах собирает и вносит команда платформы на месте, с согласия владельца. Цены, часы работы и другие данные могут меняться — они носят справочный характер и не гарантируются.",
          "Если вы заметили ошибку, воспользуйтесь кнопкой «Неверные данные? Сообщите нам» на странице бизнеса.",
          "Владелец бизнеса может в любой момент попросить изменить информацию или убрать бизнес с сайта.",
        ],
      },
      {
        id: "sharhlar",
        heading: "3. Правила отзывов",
        body: [
          "Отзыв должен основываться на вашем реальном опыте. Запрещены:",
          {
            list: [
              "оскорбления, дискриминация и угрозы;",
              "реклама и ссылки на другие бизнесы или сайты;",
              "номера телефонов и другие персональные данные;",
              "фейковые отзывы, в том числе за деньги или выгоду;",
              "текст, не относящийся к бизнесу.",
            ],
          },
          "Отзывы проходят модерацию. Отзыв, нарушающий правила, отклоняется с указанием причины или удаляется позже.",
        ],
      },
      {
        id: "akkaunt",
        heading: "4. Аккаунт",
        body: [
          "Запрещено входить от имени другого человека или накручивать оценки через несколько аккаунтов. Аккаунт, нарушающий правила, может быть заблокирован.",
          "Вы можете удалить аккаунт в любой момент на странице профиля.",
        ],
      },
      {
        id: "javobgarlik",
        heading: "5. Ответственность",
        body: [
          "Сайт предоставляется «как есть». Платформа не отвечает за качество, цену и исполнение услуг и товаров бизнесов — такие вопросы решаются между клиентом и бизнесом.",
        ],
      },
      {
        id: "ozgarishlar",
        heading: "6. Изменения и применимое право",
        body: [
          "Условия могут обновляться; дата обновления указана в начале страницы. К условиям применяется законодательство Республики Узбекистан.",
        ],
      },
    ],
  },
};

const privacy: Record<AppLocale, LegalDocument> = {
  uz: {
    title: "Maxfiylik siyosati",
    description: "Yaqin qanday maʼlumotlarni yigʻadi, nima uchun va qanday saqlaydi.",
    updated: UPDATED,
    sections: [
      {
        id: "qisqacha",
        heading: "Qisqacha",
        body: [
          "Biz faqat xizmat ishlashi uchun kerakli maʼlumotni yigʻamiz, uni sotmaymiz va reklama uchun ishlatmaymiz. Maʼlumotlar Oʻzbekistondagi serverlarda saqlanadi.",
        ],
      },
      {
        id: "yigiladi",
        heading: "1. Qanday maʼlumotlar yigʻiladi",
        body: [
          {
            list: [
              "Akkaunt: Telegram yoki Google orqali kirganingizda — hisob identifikatori, ismingiz va (boʻlsa) rasm havolasi. Parolingiz bizga kelmaydi.",
              "Siz qoldirgan kontent: sharhlar va baholar, notoʻgʻri maʼlumot haqidagi xabarlar, sevimlilar roʻyxati.",
              "“Biznesingizni qoʻshing” formasi: ismingiz, telefon raqamingiz va biznes haqidagi maʼlumot — faqat siz bilan bogʻlanish uchun.",
              "Joylashuv: faqat ruxsatingiz bilan, taxminan 110 metr aniqlikda brauzeringizda (cookie) saqlanadi. U yaqin bizneslarni saralash uchun soʻrov bilan yuboriladi, serverda saqlanmaydi.",
              "Statistika: biznes sahifasi necha marta koʻrilgani va tugmalar necha marta bosilgani — sizga bogʻlanmagan holda, faqat son sifatida.",
            ],
          },
        ],
      },
      {
        id: "maqsad",
        heading: "2. Nima uchun ishlatiladi",
        body: [
          "Saytni ishlatish, sharhlaringizni koʻrsatish (ism va familiyaning bosh harfi bilan), moderatsiya, firibgarlik va spamga qarshi kurash, biznes egalariga umumiy statistika berish uchun.",
        ],
      },
      {
        id: "uchinchi",
        heading: "3. Uchinchi shaxslar",
        body: [
          "Maʼlumotlaringiz sotilmaydi va uchinchi shaxslarga berilmaydi, qonunda belgilangan hollar bundan mustasno.",
          {
            list: [
              "Xarita plitkalari OpenFreeMap serverlaridan yuklanadi — ular IP manzilingizni koʻradi.",
              "Telegram va Google orqali kirishda ularning maxfiylik siyosati amal qiladi.",
            ],
          },
        ],
      },
      {
        id: "saqlash",
        heading: "4. Qayerda va qancha saqlanadi",
        body: [
          "Maʼlumotlar Oʻzbekistondagi serverlarda saqlanadi. Akkaunt maʼlumotlari akkaunt oʻchirilguncha, “Biznesingizni qoʻshing” formasi maʼlumotlari soʻrov yopilgandan keyin 12 oy ichida oʻchiriladi.",
        ],
      },
      {
        id: "huquqlar",
        heading: "5. Huquqlaringiz",
        body: [
          "Profil sahifasida ismingizni oʻzgartirishingiz va akkauntingizni oʻchirishingiz mumkin. Oʻchirilganda shaxsiy maʼlumotlaringiz oʻchiriladi; chop etilgan sharhlar “Oʻchirilgan foydalanuvchi” nomi bilan qolishi mumkin.",
          "Boshqa savollar boʻyicha “Aloqa” sahifasi orqali murojaat qiling.",
        ],
      },
      {
        id: "cookie",
        heading: "6. Cookie fayllari",
        body: [
          "Faqat zarur cookie'lar ishlatiladi, analitika va reklama cookie'lari yoʻq:",
          {
            list: [
              "sessionid — tizimga kirganingizni eslab qolish;",
              "csrftoken — soxta soʻrovlardan himoya;",
              "yaqin_loc — taxminiy joylashuvingiz (faqat ruxsat bersangiz).",
            ],
          },
        ],
      },
    ],
  },
  ru: {
    title: "Политика конфиденциальности",
    description: "Какие данные собирает Yaqin, зачем и как хранит.",
    updated: UPDATED,
    sections: [
      {
        id: "qisqacha",
        heading: "Коротко",
        body: [
          "Мы собираем только данные, необходимые для работы сервиса, не продаём их и не используем для рекламы. Данные хранятся на серверах в Узбекистане.",
        ],
      },
      {
        id: "yigiladi",
        heading: "1. Какие данные собираются",
        body: [
          {
            list: [
              "Аккаунт: при входе через Telegram или Google — идентификатор аккаунта, имя и (если есть) ссылка на фото. Ваш пароль к нам не попадает.",
              "Ваш контент: отзывы и оценки, сообщения о неверной информации, список избранного.",
              "Форма «Добавить свой бизнес»: имя, номер телефона и сведения о бизнесе — только чтобы связаться с вами.",
              "Местоположение: только с вашего разрешения, с точностью около 110 метров, хранится в браузере (cookie). Отправляется с запросом для сортировки ближайших бизнесов и не сохраняется на сервере.",
              "Статистика: сколько раз просмотрена страница бизнеса и нажаты кнопки — без привязки к вам, только числа.",
            ],
          },
        ],
      },
      {
        id: "maqsad",
        heading: "2. Для чего используются",
        body: [
          "Для работы сайта, показа ваших отзывов (с именем и первой буквой фамилии), модерации, борьбы с мошенничеством и спамом, предоставления владельцам бизнесов общей статистики.",
        ],
      },
      {
        id: "uchinchi",
        heading: "3. Третьи лица",
        body: [
          "Ваши данные не продаются и не передаются третьим лицам, кроме случаев, предусмотренных законом.",
          {
            list: [
              "Тайлы карты загружаются с серверов OpenFreeMap — они видят ваш IP-адрес.",
              "При входе через Telegram и Google действуют их политики конфиденциальности.",
            ],
          },
        ],
      },
      {
        id: "saqlash",
        heading: "4. Где и сколько хранятся",
        body: [
          "Данные хранятся на серверах в Узбекистане. Данные аккаунта — до удаления аккаунта; данные формы «Добавить свой бизнес» удаляются в течение 12 месяцев после закрытия заявки.",
        ],
      },
      {
        id: "huquqlar",
        heading: "5. Ваши права",
        body: [
          "На странице профиля можно изменить имя и удалить аккаунт. При удалении персональные данные удаляются; опубликованные отзывы могут остаться с подписью «Удалённый пользователь».",
          "По другим вопросам обращайтесь через страницу «Контакты».",
        ],
      },
      {
        id: "cookie",
        heading: "6. Файлы cookie",
        body: [
          "Используются только необходимые cookie, аналитических и рекламных нет:",
          {
            list: [
              "sessionid — запоминает, что вы вошли;",
              "csrftoken — защита от поддельных запросов;",
              "yaqin_loc — примерное местоположение (только с вашего разрешения).",
            ],
          },
        ],
      },
    ],
  },
};

export const LEGAL = { terms, privacy } as const;
export type LegalKind = keyof typeof LEGAL;

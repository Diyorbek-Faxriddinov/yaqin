"""Boshlang'ich maʼlumot: Toshkent tumanlari va kategoriyalar daraxti (haqiqiy taksonomiya).

Frontend fixture'laridan (`frontend/src/mocks/fixtures/`) avtomatik ko'chirilgan — ikkala tomon
bir xil slug'larni ishlatadi. Demo bizneslar bu yerda YO'Q: haqiqiy bizneslar admin panel
orqali kiritiladi.
Tuman markazlari taxminiy (xarita va masofa uchun yetarli).
"""

# (slug, nom uz, nom ru, kenglik, uzunlik)
DISTRICTS: list[tuple[str, str, str, float, float]] = [
    ("bektemir", "Bektemir", "Бектемир", 41.209, 69.3347),
    ("chilonzor", "Chilonzor", "Чиланзар", 41.2755, 69.2042),
    ("mirobod", "Mirobod", "Мирабад", 41.287, 69.281),
    ("mirzo-ulugbek", "Mirzo Ulugʻbek", "Мирзо-Улугбек", 41.338, 69.335),
    ("olmazor", "Olmazor", "Алмазар", 41.348, 69.213),
    ("sergeli", "Sergeli", "Сергели", 41.227, 69.219),
    ("shayxontohur", "Shayxontohur", "Шайхантахур", 41.326, 69.228),
    ("uchtepa", "Uchtepa", "Учтепа", 41.29, 69.17),
    ("yakkasaroy", "Yakkasaroy", "Яккасарай", 41.286, 69.256),
    ("yangihayot", "Yangihayot", "Янгихаёт", 41.2, 69.24),
    ("yashnobod", "Yashnobod", "Яшнабад", 41.295, 69.33),
    ("yunusobod", "Yunusobod", "Юнусабад", 41.364, 69.286),
]

# (slug, ikonka, nom uz, nom ru, [(ichki slug, nom uz, nom ru), ...])
CATEGORY_TREE: list[tuple[str, str, str, str, list[tuple[str, str, str]]]] = [
    (
        "dokonlar",
        "shopping",
        "Doʻkonlar",
        "Магазины",
        [
            ("kiyim-kechak", "Kiyim-kechak", "Одежда"),
            ("poyabzal", "Poyabzal", "Обувь"),
            ("elektronika", "Elektronika va texnika", "Электроника и техника"),
            ("oziq-ovqat", "Oziq-ovqat", "Продукты"),
            ("uy-rozgor", "Uy-roʻzgʻor buyumlari", "Товары для дома"),
            ("qurilish-mollari", "Qurilish mollari", "Стройматериалы"),
            ("kosmetika", "Kosmetika", "Косметика"),
            ("oyinchoqlar", "Oʻyinchoqlar", "Игрушки"),
            ("gul-sovga", "Gullar va sovgʻalar", "Цветы и подарки"),
        ],
    ),
    (
        "ovqatlanish",
        "food",
        "Ovqatlanish",
        "Еда",
        [
            ("restoranlar", "Restoranlar", "Рестораны"),
            ("kafelar", "Kafelar", "Кафе"),
            ("choyxonalar", "Choyxonalar", "Чайханы"),
            ("fast-food", "Fast-food", "Фастфуд"),
            ("qandolatxonalar", "Qandolatxonalar", "Кондитерские"),
        ],
    ),
    (
        "gozallik",
        "beauty",
        "Goʻzallik va parvarish",
        "Красота и уход",
        [
            ("sartaroshxonalar", "Sartaroshxonalar", "Парикмахерские"),
            ("gozallik-salonlari", "Goʻzallik salonlari", "Салоны красоты"),
            ("manikyur", "Manikyur va pedikyur", "Маникюр и педикюр"),
            ("kosmetologiya", "Kosmetologiya", "Косметология"),
        ],
    ),
    (
        "maishiy-xizmatlar",
        "home-services",
        "Uy va maishiy xizmatlar",
        "Бытовые услуги",
        [
            ("santexnika", "Santexnika", "Сантехника"),
            ("elektrik", "Elektrik xizmatlari", "Электрики"),
            ("texnika-tamiri", "Maishiy texnika taʼmiri", "Ремонт бытовой техники"),
            ("telefon-tamiri", "Telefon va kompyuter taʼmiri", "Ремонт телефонов и компьютеров"),
            ("uy-tozalash", "Uy tozalash", "Уборка"),
            ("yuk-tashish", "Yuk tashish", "Грузоперевозки"),
            ("kimyoviy-tozalash", "Kimyoviy tozalash va kir yuvish", "Химчистка и прачечная"),
            ("atelye", "Atelye va tikuvchilik", "Ателье"),
        ],
    ),
    (
        "avto",
        "auto",
        "Avto",
        "Авто",
        [
            ("avtoservis", "Avtoservis", "Автосервис"),
            ("avtomoyka", "Avtomoyka", "Автомойка"),
            ("shinomontaj", "Shinomontaj", "Шиномонтаж"),
            ("ehtiyot-qismlar", "Ehtiyot qismlar", "Автозапчасти"),
        ],
    ),
    (
        "soglik",
        "health",
        "Sogʻliq",
        "Здоровье",
        [
            ("dorixonalar", "Dorixonalar", "Аптеки"),
            ("klinikalar", "Klinikalar", "Клиники"),
            ("stomatologiya", "Stomatologiya", "Стоматология"),
            ("diagnostika", "Diagnostika markazlari", "Диагностические центры"),
        ],
    ),
    (
        "talim",
        "education",
        "Taʼlim",
        "Образование",
        [
            ("oquv-markazlari", "Oʻquv markazlari", "Учебные центры"),
            ("til-kurslari", "Til kurslari", "Языковые курсы"),
            ("repetitorlar", "Repetitorlar", "Репетиторы"),
        ],
    ),
    (
        "sport-dam-olish",
        "sport",
        "Sport va dam olish",
        "Спорт и отдых",
        [
            ("fitnes", "Sport va fitnes", "Спорт и фитнес"),
            ("oyin-markazlari", "Oʻyin markazlari", "Игровые центры"),
            ("bolalar-maskanlari", "Bolalar uchun maskanlar", "Детские развлечения"),
        ],
    ),
    (
        "sayohat",
        "travel",
        "Sayohat va mehmonxonalar",
        "Путешествия и отели",
        [
            ("mehmonxonalar", "Mehmonxonalar", "Гостиницы"),
            ("turistik-xizmatlar", "Turistik xizmatlar", "Туристические услуги"),
        ],
    ),
    (
        "toy-tadbirlar",
        "events",
        "Toʻy va tadbirlar",
        "Свадьбы и мероприятия",
        [
            ("toyxonalar", "Toʻyxonalar", "Банкетные залы"),
            ("fotograflar", "Fotograf va videograflar", "Фото и видеосъёмка"),
        ],
    ),
    (
        "uy-hayvonlari",
        "pets",
        "Uy hayvonlari",
        "Домашние животные",
        [
            ("veterinariya", "Veterinariya", "Ветеринария"),
            ("zoodokonlar", "Zoodoʻkonlar", "Зоомагазины"),
        ],
    ),
    (
        "professional-xizmatlar",
        "professional",
        "Professional xizmatlar",
        "Профессиональные услуги",
        [
            ("notarius", "Notariuslar", "Нотариусы"),
            ("yuristlar", "Yuristlar", "Юристы"),
            ("buxgalteriya", "Buxgalteriya xizmatlari", "Бухгалтерские услуги"),
        ],
    ),
]

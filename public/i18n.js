/* =====================================================================
   .cache — i18n
   Real translations for nav, hero, sections, manifesto, members, cart,
   footer. Code-style strings (".cache", "git tag", SKUs, prices) are
   preserved across languages.
   ===================================================================== */

window.LANG_CODES   = ['en', 'ja', 'de', 'fr', 'ko'];
window.LANG_LABELS  = { en: 'English', ja: '日本語', de: 'Deutsch', fr: 'Français', ko: '한국어' };
window.LANG_SHORT   = { en: 'EN',      ja: 'JA',     de: 'DE',      fr: 'FR',       ko: 'KO' };

window.I18N = {

  /* =================== ENGLISH =================== */
  en: {
    nav: { drop: 'Drop 001', inventory: 'Inventory', manifesto: 'Manifesto', archive: 'Archive', ambassador: 'Ambassador', members: 'Members', cart: 'Cart' },
    hero: {
      dropLabel: 'Drop 001 · SS26',
      release: 'Release — 14.06.26 · 19:00 UTC',
      status: 'Status · Pre-warmed',
      kicker: '// Streetwear for the people who ship it',
      tag1: 'A small studio in Berlin and Tokyo. Heavyweight cottons, technical knits, hand-screened runs of',
      tagLimit: '500 or less',
      tag2: '. Members get the keys.',
      viewDrop: 'View Drop 001',
      toInvalidation: 'to invalidation',
    },
    feat: {
      eyebrow: '// Featured — 03 pieces',
      titleA: 'Wear the', titleB: 'stack.',
      aside: 'Drop 001 lands across three silhouettes — a heavyweight tee, a cropped quilted shell, and the membership knit. Tap a card to preview the full spec sheet.',
      prev: 'Prev', next: 'Next',
    },
    inv: {
      eyebrow: '// The full drop — 16 objects',
      titleA: 'Cache', titleB: '/ inventory',
      all: 'All', apparel: 'Apparel', knit: 'Knit', headwear: 'Headwear', objects: 'Objects', digital: 'Digital',
      add: 'Add', download: 'Download',
      inStock: 'In Stock', lowStock: 'Low Stock', soldOut: 'Sold Out', instant: 'Instant Download',
    },
    man: {
      eyebrow: '// Manifesto — hover a line',
      subA: 'Five rules.', subB: 'Hashed in.',
      aside: ".cache is run by twelve people in Berlin and Tokyo. We don't run sales, we don't restock, and we don't sell to the resale market. Every drop is a commit — once it ships, it's archived.",
      lines: [
        ["We don't drop", 'We commit.'],
        ['collections', 'runs of 500'],
        ['we hash them', 'we sign them'],
        ['we tag seams', 'git tag v1.0'],
        ['then we ship', 'then archive'],
      ],
      foot1: 'Berlin / Tokyo', foot1Sub: 'Studio + Atelier',
      foot2: '12 people',     foot2Sub: 'Build the whole thing',
    },
    mem: {
      eyebrow: '// Members · 184 of 500 keys remaining',
      headA: 'Three ways', headB: 'in.', headC: 'Pick one.',
      intro: 'Members get 96 hours on every drop, archive pricing on retired pieces, and a vote on what ships next. Pull keys by shipping code to an approved repo, by applying through the Cozy Devs Discord, or by minting the member seal.',
      path1Num: 'Contribute',
      path1Title: 'Ship code.',
      path1Desc: 'Push a merged PR to any approved repo. We watch the tag, you get the keys. Auto-verified through GitHub.',
      path1Cta: 'Verify with GitHub',
      path2Num: 'Apply',
      path2Title: 'Cozy Devs.',
      path2Desc: 'Tell us what you build. Twelve of us read every message. No template, no forms. Just say hi.',
      path2Server: 'Discord server',
      path2Online: 'Online now',
      path2Members: 'members',
      path2Note: 'Average reply time · under 48 hours · weekdays',
      path2Cta: 'Join Cozy Devs',
      path3Num: 'Purchase',
      path3Title: 'Member SNFT.',
      path3Desc: 'Mint the seal. Soulbound, non-transferable. One-time, lifetime keys — the same seal rotating to your right.',
      path3Minted: 'minted on Base',
      path3Note: 'Contract verified · No royalties · Burnable',
      path3Cta: 'Mint Member Seal',
      sealA: 'Member Seal · SS26', sealB: 'Issued once, archived forever.',
      perks: [
        ['96h Early Access',  'Members shop every drop ninety-six hours before the public window opens.'],
        ['Archive Pricing',   'Retired drops re-open monthly at member rates only — no markups, no resellers.'],
        ['Free Member Knit',  'A limited piece shipped with your onboarding order. New colorway every season.'],
        ['Vote The Drop',     "One member, one vote on next season's direction, fits, and colorway."],
      ],
    },
    cart: {
      title: 'Your Cache',
      summary0: '0 items · awaiting items',
      summaryN: (n) => `${n} item${n===1?'':'s'} · ready to commit`,
      emptyBig: 'empty cache',
      emptyLine: 'Pull a piece from drop 001 or browse inventory.',
      browse: 'Browse Drop',
      subtotal: 'Subtotal',
      checkout: 'Checkout',
      noteFree: 'Free',
      noteRest: 'worldwide shipping over $200 · Duty included',
      remove: 'Remove',
      added: 'Added',
      free: 'FREE',
    },
    footer: {
      shop: 'Shop', cache: 'Cache', support: 'Support', follow: 'Follow',
      shopLinks:    ['Drop 001', 'Archive', 'Member Pricing', 'Gift Cards'],
      cacheLinks:   ['Manifesto', 'Process', 'Studio', 'Press'],
      supportLinks: ['Sizing', 'Care', 'Shipping', 'Returns'],
      followLinks:  ['Instagram', 'TikTok', 'X', 'RSS'],
      rights: '© .cache 2026',
      cities: 'Berlin / Tokyo',
      build:  'Build v1.0.4 — 2026.05.22',
      tagline:'No Resellers / No Lies',
    },
  },

  /* =================== JAPANESE =================== */
  ja: {
    nav: { drop: 'ドロップ 001', inventory: 'インベントリ', manifesto: 'マニフェスト', archive: 'アーカイブ', ambassador: 'アンバサダー', members: 'メンバー', cart: 'カート' },
    hero: {
      dropLabel: 'DROP 001 · SS26',
      release: 'リリース — 14.06.26 · 19:00 UTC',
      status: 'ステータス · プリウォーム',
      kicker: '// ソフトウェアを出荷する人のためのストリートウェア',
      tag1: 'ベルリンと東京の小さなスタジオ。ヘビーウェイトコットン、テクニカルニット、',
      tagLimit: '500点限定',
      tag2: 'のハンドスクリーンプロダクト。メンバーが鍵を持っています。',
      viewDrop: 'ドロップ 001 を見る',
      toInvalidation: '失効まで',
    },
    feat: {
      eyebrow: '// フィーチャード — 3 ピース',
      titleA: 'スタックを', titleB: '着る。',
      aside: 'ドロップ 001 は 3 つのシルエットで展開 — ヘビーウェイト T、クロップキルティドシェル、メンバーシップニット。カードをタップしてスペックシートを表示。',
      prev: '前へ', next: '次へ',
    },
    inv: {
      eyebrow: '// フルドロップ — 16 オブジェクト',
      titleA: 'キャッシュ', titleB: '/ インベントリ',
      all: 'すべて', apparel: 'アパレル', knit: 'ニット', headwear: 'ヘッドウェア', objects: 'オブジェクト', digital: 'デジタル',
      add: '追加', download: 'ダウンロード',
      inStock: '在庫あり', lowStock: '残りわずか', soldOut: '完売', instant: '即時ダウンロード',
    },
    man: {
      eyebrow: '// マニフェスト — 行にホバー',
      subA: '5 つのルール。', subB: 'ハッシュ済み。',
      aside: '.cache はベルリンと東京の 12 人で運営しています。セールも再入荷もしません。リセール市場には売りません。すべてのドロップはコミット — 出荷したらアーカイブ。',
      lines: [
        ['ドロップしない', 'コミットする。'],
        ['コレクション', '500 のラン'],
        ['ハッシュをかける', '署名する'],
        ['シームにタグ', 'git tag v1.0'],
        ['そして出荷', 'そしてアーカイブ'],
      ],
      foot1: 'ベルリン / 東京', foot1Sub: 'スタジオ + アトリエ',
      foot2: '12 人',           foot2Sub: 'すべてを作る',
    },
    mem: {
      eyebrow: '// メンバー · 500 のうち 184 の鍵が残っています',
      headA: '3 つの方法。', headB: '入る。', headC: '1 つ選ぶ。',
      intro: 'メンバーはすべてのドロップで 96 時間先行アクセス、過去ピースのアーカイブ価格、次に何を出すかの投票権を得ます。承認済みリポジトリへのコード貢献、Cozy Devs Discord での申請、またはメンバーシールの mint で鍵を得られます。',
      path1Num: '貢献',
      path1Title: 'コードを出荷。',
      path1Desc: '承認済みリポジトリにマージされた PR を出してください。タグを監視し、鍵をお渡しします。GitHub で自動認証。',
      path1Cta: 'GitHub で認証',
      path2Num: '申請',
      path2Title: 'Cozy Devs。',
      path2Desc: '何を作っているか教えてください。12 人全員がすべてのメッセージを読みます。テンプレートもフォームもなし。',
      path2Server: 'Discord サーバー',
      path2Online: 'オンライン',
      path2Members: 'メンバー',
      path2Note: '平均返信時間 · 48 時間以内 · 平日',
      path2Cta: 'Cozy Devs に参加',
      path3Num: '購入',
      path3Title: 'メンバー SNFT。',
      path3Desc: 'シールを mint。譲渡不可、一度きり、永久に有効 — 右で回転しているシールと同じ。',
      path3Minted: 'Base で mint 済み',
      path3Note: '契約検証済み · ロイヤリティなし · バーン可能',
      path3Cta: 'メンバーシールを Mint',
      sealA: 'メンバーシール · SS26', sealB: '一度発行、永遠にアーカイブ。',
      perks: [
        ['96時間 早期アクセス', 'メンバーは一般公開の 96 時間前にすべてのドロップを購入できます。'],
        ['アーカイブ価格',     '過去のドロップは月次でメンバー価格のみで再公開 — 上乗せなし、転売なし。'],
        ['無料メンバーニット',  '初回注文時に限定ピースを同梱。シーズンごとに新カラーウェイ。'],
        ['ドロップ投票',       '1 メンバー 1 票。次シーズンの方向性、フィット、カラーを決定。'],
      ],
    },
    cart: {
      title: 'マイキャッシュ',
      summary0: '0 アイテム · 待機中',
      summaryN: (n) => `${n} アイテム · 準備完了`,
      emptyBig: '空のキャッシュ',
      emptyLine: 'ドロップ 001 から選ぶか、インベントリを見る。',
      browse: 'ドロップを見る',
      subtotal: '小計',
      checkout: 'チェックアウト',
      noteFree: '送料無料',
      noteRest: '$200 以上のご注文 · 関税込み',
      remove: '削除',
      added: '追加',
      free: '無料',
    },
    footer: {
      shop: 'ショップ', cache: 'キャッシュ', support: 'サポート', follow: 'フォロー',
      shopLinks:    ['ドロップ 001', 'アーカイブ', 'メンバー価格', 'ギフトカード'],
      cacheLinks:   ['マニフェスト', 'プロセス', 'スタジオ', 'プレス'],
      supportLinks: ['サイジング', 'お手入れ', '配送', '返品'],
      followLinks:  ['Instagram', 'TikTok', 'X', 'RSS'],
      rights: '© .cache 2026',
      cities: 'ベルリン / 東京',
      build:  'ビルド v1.0.4 — 2026.05.22',
      tagline:'転売禁止 / 嘘なし',
    },
  },

  /* =================== GERMAN =================== */
  de: {
    nav: { drop: 'Drop 001', inventory: 'Inventar', manifesto: 'Manifest', archive: 'Archiv', ambassador: 'Botschafter', members: 'Mitglieder', cart: 'Warenkorb' },
    hero: {
      dropLabel: 'Drop 001 · SS26',
      release: 'Release — 14.06.26 · 19:00 UTC',
      status: 'Status · Vorbereitet',
      kicker: '// Streetwear für die, die sie ausliefern',
      tag1: 'Ein kleines Studio in Berlin und Tokio. Schwere Baumwolle, technische Strickwaren, handgesiebdruckte Auflagen von',
      tagLimit: '500 oder weniger',
      tag2: '. Mitglieder bekommen die Schlüssel.',
      viewDrop: 'Drop 001 ansehen',
      toInvalidation: 'bis Invalidierung',
    },
    feat: {
      eyebrow: '// Featured — 03 Stücke',
      titleA: 'Trag den', titleB: 'Stack.',
      aside: 'Drop 001 erscheint in drei Silhouetten — ein schweres Tee, eine kurze gesteppte Shell, und der Mitgliedsknit. Karte antippen für das volle Spec Sheet.',
      prev: 'Zurück', next: 'Weiter',
    },
    inv: {
      eyebrow: '// Der ganze Drop — 16 Objekte',
      titleA: 'Cache', titleB: '/ Inventar',
      all: 'Alle', apparel: 'Bekleidung', knit: 'Strick', headwear: 'Kopfbedeckung', objects: 'Objekte', digital: 'Digital',
      add: 'Hinzufügen', download: 'Download',
      inStock: 'Verfügbar', lowStock: 'Wenig vorrätig', soldOut: 'Ausverkauft', instant: 'Sofort-Download',
    },
    man: {
      eyebrow: '// Manifest — Zeile berühren',
      subA: 'Fünf Regeln.', subB: 'Eingehasht.',
      aside: '.cache wird von zwölf Personen in Berlin und Tokio betrieben. Keine Sales, kein Restock, kein Resale. Jeder Drop ist ein Commit — einmal ausgeliefert, ist er im Archiv.',
      lines: [
        ['Wir droppen nicht', 'Wir committen.'],
        ['Kollektionen', 'Auflagen von 500'],
        ['wir hashen sie', 'wir signieren sie'],
        ['wir taggen Nähte', 'git tag v1.0'],
        ['dann shippen wir', 'dann Archiv'],
      ],
      foot1: 'Berlin / Tokio', foot1Sub: 'Studio + Atelier',
      foot2: '12 Menschen',    foot2Sub: 'Bauen das Ganze',
    },
    mem: {
      eyebrow: '// Mitglieder · 184 von 500 Schlüsseln verfügbar',
      headA: 'Drei Wege', headB: 'rein.', headC: 'Wähl einen.',
      intro: 'Mitglieder bekommen 96 Stunden Frühzugriff auf jeden Drop, Archivpreise auf vergangene Pieces und eine Stimme zum nächsten Drop. Hol dir die Schlüssel durch Code-Beiträge zu einem genehmigten Repo, durch Bewerbung im Cozy Devs Discord, oder durch Minten des Member Seals.',
      path1Num: 'Beitragen',
      path1Title: 'Code shippen.',
      path1Desc: 'Push einen gemergten PR in ein genehmigtes Repo. Wir beobachten den Tag, du bekommst die Schlüssel. Auto-verifiziert über GitHub.',
      path1Cta: 'Mit GitHub verifizieren',
      path2Num: 'Bewerben',
      path2Title: 'Cozy Devs.',
      path2Desc: 'Erzähl uns was du baust. Zwölf von uns lesen jede Nachricht. Kein Template, kein Formular. Sag einfach hi.',
      path2Server: 'Discord-Server',
      path2Online: 'Online jetzt',
      path2Members: 'Mitglieder',
      path2Note: 'Antwortzeit · unter 48 Stunden · werktags',
      path2Cta: 'Cozy Devs beitreten',
      path3Num: 'Kaufen',
      path3Title: 'Member SNFT.',
      path3Desc: 'Mint das Siegel. Soulbound, nicht übertragbar. Einmalig, lebenslange Schlüssel — dasselbe Siegel das rechts rotiert.',
      path3Minted: 'gemintet auf Base',
      path3Note: 'Vertrag verifiziert · Keine Royalties · Brennbar',
      path3Cta: 'Member Seal minten',
      sealA: 'Mitgliedssiegel · SS26', sealB: 'Einmal ausgestellt, für immer archiviert.',
      perks: [
        ['96h Frühzugriff',          'Mitglieder kaufen jeden Drop sechsundneunzig Stunden vor allen anderen.'],
        ['Archivpreise',             'Vergangene Drops öffnen monatlich nur zu Mitgliedspreisen — keine Aufschläge, keine Reseller.'],
        ['Kostenloser Mitglieds-Knit','Ein limitiertes Stück mit deiner Onboarding-Bestellung. Neue Farbe pro Saison.'],
        ['Drop Voting',              'Ein Mitglied, eine Stimme über Richtung, Schnitte und Farben der nächsten Saison.'],
      ],
    },
    cart: {
      title: 'Dein Cache',
      summary0: '0 Artikel · keine Auswahl',
      summaryN: (n) => `${n} Artikel · bereit zum Committen`,
      emptyBig: 'leerer cache',
      emptyLine: 'Hol dir ein Stück aus Drop 001 oder schau ins Inventar.',
      browse: 'Drop ansehen',
      subtotal: 'Zwischensumme',
      checkout: 'Zur Kasse',
      noteFree: 'Kostenloser',
      noteRest: 'weltweiter Versand ab $200 · Zoll inklusive',
      remove: 'Entfernen',
      added: 'Hinzugefügt',
      free: 'GRATIS',
    },
    footer: {
      shop: 'Shop', cache: 'Cache', support: 'Support', follow: 'Folgen',
      shopLinks:    ['Drop 001', 'Archiv', 'Mitgliedspreise', 'Geschenkkarten'],
      cacheLinks:   ['Manifest', 'Prozess', 'Studio', 'Presse'],
      supportLinks: ['Größen', 'Pflege', 'Versand', 'Rücksendungen'],
      followLinks:  ['Instagram', 'TikTok', 'X', 'RSS'],
      rights: '© .cache 2026',
      cities: 'Berlin / Tokio',
      build:  'Build v1.0.4 — 2026.05.22',
      tagline:'Keine Reseller / Keine Lügen',
    },
  },

  /* =================== FRENCH =================== */
  fr: {
    nav: { drop: 'Drop 001', inventory: 'Inventaire', manifesto: 'Manifeste', archive: 'Archive', ambassador: 'Ambassadeur', members: 'Membres', cart: 'Panier' },
    hero: {
      dropLabel: 'Drop 001 · SS26',
      release: 'Sortie — 14.06.26 · 19:00 UTC',
      status: 'Statut · Préchauffé',
      kicker: '// Streetwear pour ceux qui shippent le code',
      tag1: 'Un petit studio à Berlin et Tokyo. Cotons épais, mailles techniques, séries sérigraphiées à la main de',
      tagLimit: '500 ou moins',
      tag2: '. Les membres ont les clés.',
      viewDrop: 'Voir Drop 001',
      toInvalidation: 'avant invalidation',
    },
    feat: {
      eyebrow: '// Sélection — 03 pièces',
      titleA: 'Porte le', titleB: 'stack.',
      aside: 'Drop 001 arrive en trois silhouettes — un tee épais, une veste matelassée courte, et la maille membre. Tape une carte pour voir la fiche complète.',
      prev: 'Préc.', next: 'Suiv.',
    },
    inv: {
      eyebrow: '// Le drop complet — 16 objets',
      titleA: 'Cache', titleB: '/ inventaire',
      all: 'Tout', apparel: 'Vêtements', knit: 'Maille', headwear: 'Casquettes', objects: 'Objets', digital: 'Numérique',
      add: 'Ajouter', download: 'Télécharger',
      inStock: 'En stock', lowStock: 'Stock faible', soldOut: 'Épuisé', instant: 'Téléchargement instantané',
    },
    man: {
      eyebrow: '// Manifeste — survolez une ligne',
      subA: 'Cinq règles.', subB: 'Hashées.',
      aside: '.cache est dirigé par douze personnes à Berlin et Tokyo. Pas de soldes, pas de restock, pas de revente. Chaque drop est un commit — une fois shippé, il est archivé.',
      lines: [
        ['On ne drop pas', 'On commit.'],
        ['collections', 'séries de 500'],
        ['on les hashe', 'on les signe'],
        ['on tag les coutures', 'git tag v1.0'],
        ['puis on ship', 'puis on archive'],
      ],
      foot1: 'Berlin / Tokyo', foot1Sub: 'Studio + Atelier',
      foot2: '12 personnes',   foot2Sub: 'Construisent tout',
    },
    mem: {
      eyebrow: '// Membres · 184 sur 500 clés restantes',
      headA: 'Trois façons', headB: "d'entrer.", headC: 'Choisis-en une.',
      intro: 'Les membres ont 96 heures sur chaque drop, des prix archive sur les pièces retirées, et un vote sur ce qui shippe. Récupère les clés en contribuant du code à un repo approuvé, en candidatant via le Discord Cozy Devs, ou en mintant le sceau membre.',
      path1Num: 'Contribuer',
      path1Title: 'Ship du code.',
      path1Desc: 'Push une PR mergée vers un repo approuvé. On regarde le tag, tu reçois les clés. Auto-vérifié via GitHub.',
      path1Cta: 'Vérifier avec GitHub',
      path2Num: 'Candidater',
      path2Title: 'Cozy Devs.',
      path2Desc: 'Dis-nous ce que tu construis. Nous sommes douze à lire chaque message. Pas de template, pas de formulaire.',
      path2Server: 'Serveur Discord',
      path2Online: 'En ligne',
      path2Members: 'membres',
      path2Note: 'Temps de réponse moyen · sous 48 heures · jours ouvrés',
      path2Cta: 'Rejoindre Cozy Devs',
      path3Num: 'Acheter',
      path3Title: 'SNFT Membre.',
      path3Desc: 'Mint le sceau. Soulbound, non-transférable. Une fois, clés à vie — le même sceau qui tourne à droite.',
      path3Minted: 'mintés sur Base',
      path3Note: 'Contrat vérifié · Pas de royalties · Brûlable',
      path3Cta: 'Mint le Sceau Membre',
      sealA: 'Sceau membre · SS26', sealB: 'Émis une fois, archivé pour toujours.',
      perks: [
        ['Accès 96h en avance', 'Les membres achètent chaque drop quatre-vingt-seize heures avant tout le monde.'],
        ['Prix archive',        'Les drops retirés rouvrent mensuellement aux tarifs membres uniquement — pas de marges, pas de revendeurs.'],
        ['Maille membre offerte','Une pièce limitée envoyée avec votre commande d\'inscription. Nouveau coloris chaque saison.'],
        ['Vote du drop',         'Un membre, un vote sur la direction, les coupes et les couleurs de la prochaine saison.'],
      ],
    },
    cart: {
      title: 'Votre Cache',
      summary0: '0 article · en attente',
      summaryN: (n) => `${n} article${n===1?'':'s'} · prêt à committer`,
      emptyBig: 'cache vide',
      emptyLine: 'Choisissez une pièce du drop 001 ou parcourez l\'inventaire.',
      browse: 'Voir le drop',
      subtotal: 'Sous-total',
      checkout: 'Paiement',
      noteFree: 'Livraison',
      noteRest: 'mondiale gratuite à partir de $200 · Douane incluse',
      remove: 'Retirer',
      added: 'Ajouté',
      free: 'GRATUIT',
    },
    footer: {
      shop: 'Boutique', cache: 'Cache', support: 'Support', follow: 'Suivre',
      shopLinks:    ['Drop 001', 'Archive', 'Tarifs membres', 'Cartes cadeaux'],
      cacheLinks:   ['Manifeste', 'Processus', 'Studio', 'Presse'],
      supportLinks: ['Tailles', 'Entretien', 'Livraison', 'Retours'],
      followLinks:  ['Instagram', 'TikTok', 'X', 'RSS'],
      rights: '© .cache 2026',
      cities: 'Berlin / Tokyo',
      build:  'Build v1.0.4 — 2026.05.22',
      tagline:'Pas de revendeurs / Pas de mensonges',
    },
  },

  /* =================== KOREAN =================== */
  ko: {
    nav: { drop: '드롭 001', inventory: '인벤토리', manifesto: '매니페스토', archive: '아카이브', ambassador: '앰배서더', members: '멤버', cart: '카트' },
    hero: {
      dropLabel: 'DROP 001 · SS26',
      release: '출시 — 14.06.26 · 19:00 UTC',
      status: '상태 · 대기 중',
      kicker: '// 코드를 출시하는 사람들을 위한 스트리트웨어',
      tag1: '베를린과 도쿄의 작은 스튜디오. 헤비웨이트 코튼, 테크니컬 니트, 핸드 스크린',
      tagLimit: '500점 한정',
      tag2: ' 제작. 멤버에게 열쇠가 있습니다.',
      viewDrop: 'DROP 001 보기',
      toInvalidation: '만료까지',
    },
    feat: {
      eyebrow: '// 피처드 — 3 피스',
      titleA: '스택을', titleB: '입어라.',
      aside: '드롭 001은 세 가지 실루엣으로 출시 — 헤비웨이트 티, 크롭 퀼티드 셸, 멤버십 니트. 카드를 탭하여 스펙 시트를 확인하세요.',
      prev: '이전', next: '다음',
    },
    inv: {
      eyebrow: '// 전체 드롭 — 16 오브젝트',
      titleA: '캐시', titleB: '/ 인벤토리',
      all: '전체', apparel: '의류', knit: '니트', headwear: '헤드웨어', objects: '오브젝트', digital: '디지털',
      add: '추가', download: '다운로드',
      inStock: '재고 있음', lowStock: '재고 부족', soldOut: '품절', instant: '즉시 다운로드',
    },
    man: {
      eyebrow: '// 매니페스토 — 라인에 호버하세요',
      subA: '다섯 가지 규칙.', subB: '해시 완료.',
      aside: '.cache는 베를린과 도쿄의 12명이 운영합니다. 세일도, 재입고도, 리셀도 없습니다. 모든 드롭은 커밋 — 출시되면 아카이브.',
      lines: [
        ['우리는 드롭하지 않는다', '커밋한다.'],
        ['컬렉션', '500개 한정'],
        ['우리는 해시한다', '우리는 서명한다'],
        ['솔기에 태그를 단다', 'git tag v1.0'],
        ['그리고 출시', '그리고 아카이브'],
      ],
      foot1: '베를린 / 도쿄', foot1Sub: '스튜디오 + 아틀리에',
      foot2: '12명',         foot2Sub: '모든 것을 만든다',
    },
    mem: {
      eyebrow: '// 멤버 · 500개 중 184개 키 남음',
      headA: '세 가지', headB: '방법.', headC: '하나를 선택.',
      intro: '멤버는 모든 드롭에 96시간 얼리 액세스, 지난 피스에 대한 아카이브 가격, 다음 드롭에 대한 투표권을 받습니다. 승인된 리포지토리에 코드 기여, Cozy Devs Discord에서 신청, 또는 멤버 씰을 mint하여 키를 받으세요.',
      path1Num: '기여',
      path1Title: '코드 출시.',
      path1Desc: '승인된 리포지토리에 머지된 PR을 푸시하세요. 태그를 모니터링하고 키를 드립니다. GitHub로 자동 인증.',
      path1Cta: 'GitHub으로 인증',
      path2Num: '신청',
      path2Title: 'Cozy Devs.',
      path2Desc: '무엇을 만드는지 알려주세요. 12명 전원이 모든 메시지를 읽습니다. 템플릿도 폼도 없음.',
      path2Server: 'Discord 서버',
      path2Online: '온라인',
      path2Members: '멤버',
      path2Note: '평균 응답 시간 · 48시간 이내 · 평일',
      path2Cta: 'Cozy Devs 가입',
      path3Num: '구매',
      path3Title: '멤버 SNFT.',
      path3Desc: '씰을 mint하세요. 양도 불가, 일회성, 평생 키 — 오른쪽에서 회전하는 동일한 씰.',
      path3Minted: 'Base에서 mint됨',
      path3Note: '계약 검증됨 · 로열티 없음 · 소각 가능',
      path3Cta: '멤버 씰 Mint',
      sealA: '멤버 씰 · SS26', sealB: '한 번 발행, 영원히 아카이브.',
      perks: [
        ['96시간 얼리 액세스', '멤버는 모든 드롭을 일반 공개 96시간 전에 구매할 수 있습니다.'],
        ['아카이브 가격',      '지난 드롭이 매월 멤버 가격으로만 재오픈 — 추가 마진 없음, 리셀러 없음.'],
        ['멤버 니트 무료',     '온보딩 주문과 함께 한정 피스 발송. 시즌마다 새로운 컬러웨이.'],
        ['드롭 투표',         '한 멤버, 한 표. 다음 시즌의 방향, 핏, 컬러를 결정.'],
      ],
    },
    cart: {
      title: '내 캐시',
      summary0: '0 아이템 · 대기 중',
      summaryN: (n) => `${n} 아이템 · 커밋 준비 완료`,
      emptyBig: '빈 캐시',
      emptyLine: '드롭 001에서 피스를 가져오거나 인벤토리를 둘러보세요.',
      browse: '드롭 보기',
      subtotal: '소계',
      checkout: '결제',
      noteFree: '무료',
      noteRest: '$200 이상 전 세계 무료 배송 · 관세 포함',
      remove: '제거',
      added: '추가됨',
      free: '무료',
    },
    footer: {
      shop: '샵', cache: '캐시', support: '지원', follow: '팔로우',
      shopLinks:    ['드롭 001', '아카이브', '멤버 가격', '기프트 카드'],
      cacheLinks:   ['매니페스토', '프로세스', '스튜디오', '프레스'],
      supportLinks: ['사이징', '관리', '배송', '반품'],
      followLinks:  ['Instagram', 'TikTok', 'X', 'RSS'],
      rights: '© .cache 2026',
      cities: '베를린 / 도쿄',
      build:  '빌드 v1.0.4 — 2026.05.22',
      tagline:'리셀러 금지 / 거짓말 금지',
    },
  },
};

/* ---------- runtime helpers ---------- */
let _currentLang = 'en';
try { _currentLang = localStorage.getItem('dotcache.lang') || 'en'; } catch {}
if (!I18N[_currentLang]) _currentLang = 'en';

window.getLang = () => _currentLang;

window.t = (key, fallbackLang = 'en') => {
  const resolve = (lang) => {
    let v = I18N[lang];
    for (const p of key.split('.')) {
      if (v == null) return undefined;
      v = v[p];
    }
    return v;
  };
  const v = resolve(_currentLang);
  return v !== undefined ? v : resolve(fallbackLang);
};

window.applyLanguage = (lang) => {
  if (!I18N[lang]) lang = 'en';
  _currentLang = lang;
  try { localStorage.setItem('dotcache.lang', lang); } catch {}
  document.documentElement.setAttribute('lang', lang);

  // [data-i18n="key"] → set textContent
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const v = t(el.dataset.i18n);
    if (typeof v === 'string') el.textContent = v;
  });
  // [data-i18n-attr="placeholder:mem.placeholder,aria-label:nav.cart"]
  document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    el.dataset.i18nAttr.split(',').forEach((pair) => {
      const [attr, key] = pair.split(':').map((s) => s.trim());
      const v = t(key);
      if (typeof v === 'string') el.setAttribute(attr, v);
    });
  });

  // Re-render anything JS-managed
  window.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
};

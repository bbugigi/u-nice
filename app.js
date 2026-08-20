// ============================================================
// U-NiceNutraCare — Complete Application JavaScript
// API-Backed · JWT Auth · D1 Products · Modular Architecture
// ============================================================

const App = (() => {
  'use strict';

  const API_BASE = 'https://unicenutra-api.fomstreet-ke.workers.dev';

  // ===== REACTIVE STATE =====
  const _state = {
    lang: localStorage.getItem('uniceLang') || 'en',
    cart: JSON.parse(localStorage.getItem('uniceCart')) || [],
    wishlist: JSON.parse(localStorage.getItem('uniceWishlist')) || [],
    recent: JSON.parse(localStorage.getItem('uniceRecent')) || [],
    token: localStorage.getItem('uniceToken') || null,
    account: JSON.parse(localStorage.getItem('uniceAccount')) || null,
    sort: 'popular',
    category: 'all',
    priceRange: null,
    search: '',
    products: [],
    productsLoaded: false,
  };

  const state = new Proxy(_state, {
    set(target, key, value) {
      target[key] = value;
      const persist = { lang:'uniceLang', cart:'uniceCart', wishlist:'uniceWishlist', recent:'uniceRecent', token:'uniceToken', account:'uniceAccount' };
      if (persist[key]) {
        if (value === null || value === undefined) localStorage.removeItem(persist[key]);
        else localStorage.setItem(persist[key], typeof value === 'object' ? JSON.stringify(value) : value);
      }
      document.dispatchEvent(new CustomEvent('stateChange', { detail: { key, value } }));
      return true;
    }
  });

  const WA_PHONE = '254741090659';
  const WA_LINK = `https://wa.me/${WA_PHONE}`;
  const CURRENCY = 'KSh';

  // ===== API HELPERS =====
  async function apiFetch(path, options = {}) {
    const headers = { ...options.headers };
    if (options.method && options.method !== 'GET') {
      headers['Content-Type'] = 'application/json';
    }
    if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API request failed');
    return data;
  }

  // ===== PRODUCT DATA (from API) =====
  async function fetchProducts() {
    try {
      const params = new URLSearchParams();
      if (state.category !== 'all') params.set('category', state.category);
      if (state.search) params.set('q', state.search);
      if (state.sort) params.set('sort', state.sort);
      if (state.priceRange) params.set('price', state.priceRange);

      const data = await apiFetch(`/api/products?${params}`);
      state.products = data.products || [];
      state.productsLoaded = true;
      return state.products;
    } catch (err) {
      console.error('Failed to fetch products:', err);
      state.products = [];
      return [];
    }
  }

  async function fetchProduct(id) {
    try {
      return await apiFetch(`/api/products/${id}`);
    } catch (err) {
      console.error('Failed to fetch product:', err);
      return null;
    }
  }

  // ===== MODULE: I18n =====
  const I18n = (() => {
    const translations = {
      en: { tagline:"Natural · Organic · Nutritious", mobile_subtitle:"Natural Wellness Shop", nav_home:"Home", nav_categories:"Categories", nav_products:"Products", nav_flash:"Flash Sale", nav_nutrition:"Nutrition", nav_about:"About Us", nav_contact:"Contact", hero_shop:"Shop Now", hero_explore:"Explore Herbs", hero_powders:"Shop Spices", hero_slide1_tag:"New Season Collection", hero_slide1_title:"Fresh Seedlings\nFor Your Garden", hero_slide1_sub:"Healthy, well-nurtured seedlings ready to transplant. Tomatoes, kale, herbs, and more.", hero_slide2_tag:"Medicinal Herbs", hero_slide2_title:"Heal With\nNature's Power", hero_slide2_sub:"Hand-harvested Moringa, Tulsi, Rosemary, and more. Locally grown, pesticide-free.", hero_slide3_tag:"Spices & Probiotics", hero_slide3_title:"Premium\nSpices & Kombucha", hero_slide3_sub:"Turmeric, Ginger, Kefir, Kombucha — fresh from Kiambu for daily wellness.", shop_by_category:"Shop by Category", view_all:"View All →", cat_seedlings:"Seedlings", cat_herbs:"Fresh Herbs", cat_spices:"Spices & Supplements", cat_kefir:"Kefir & Kombucha", cat_diet:"Diet Plans", cat_consult:"Consulting", trust_natural:"100% Natural", trust_natural_sub:"Certified organic products", trust_delivery:"Free Delivery", trust_delivery_sub:"On orders over KSh 2,000", trust_support:"24/7 Support", trust_support_sub:"WhatsApp & phone", trust_returns:"Easy Returns", trust_returns_sub:"7-day return policy", seedlings_title:"Fresh Seedlings", seedlings_sub:"Healthy plants ready to transplant", herbs_title:"Fresh Herbs", herbs_sub:"Hand-harvested, pesticide-free", spices_title:"Spices & Supplements", spices_sub:"Pure blended spices for everyday health", kefir_title:"Kefir & Kombucha", kefir_sub:"Live culture probiotics made fresh weekly", see_all:"See All →", flash_title:"Flash Sale", flash_sub:"Limited time offers on popular items", all_products:"All Products", filter_all:"All Products", filter_seedlings:"Seedlings", filter_herbs:"Fresh Herbs", filter_spices:"Spices & Supplements", filter_kefir:"Kefir & Kombucha", sort_popular:"Popular", sort_price_low:"Price: Low→High", sort_price_high:"Price: High→Low", sort_rating:"Top Rated", sort_newest:"Newest", price_under200:"Under KSh 200", price_200_400:"KSh 200-400", price_over400:"KSh 400+", search_placeholder:"Search seedlings, herbs, spices, kefir...", search_empty:"No products found", search_empty_sub:"Try a different search term", search_clear:"Clear Search", cart_title:"Your Cart", cart_empty:"Your cart is empty", cart_empty_sub:"Add some products to get started!", cart_continue:"Continue Shopping", cart_subtotal:"Subtotal", cart_delivery_cost:"Delivery", cart_free_delivery:"Free over KSh 2,000", cart_discount:"Discount", cart_total:"Total", cart_clear:"Clear Cart", cart_promo_placeholder:"Promo code", cart_promo_apply:"Apply", cart_promo_applied:"✓ Promo applied:", cart_promo_invalid:"✕ Invalid promo code", cart_location:"Delivery Location:", cart_location_nairobi:"Nairobi", cart_location_other:"Other Kenya", pd_benefits:"Benefits", pd_reviews:"Reviews", pd_write_review:"Write a Review", pd_name_placeholder:"Your name", pd_submit_review:"Submit Review", pd_stock:"in stock", pd_low_stock:"Low stock — only", pd_add_cart:"Add to Cart", pd_add_wishlist:"Add to Wishlist", pd_share:"Share", pd_in_stock:"In Stock", nutrition_title:"Your Personal Wellness Plan", nutrition_sub:"Evidence-based nutrition guidance tailored to your body.", diet_weightloss:"Weight Loss Plan", diet_weightloss_desc:"Personalized calorie-controlled meal plans.", diet_immunity:"Immunity Boost Plan", diet_immunity_desc:"Strengthen your immune system.", diet_diabetes:"Diabetes Management", diet_diabetes_desc:"Blood sugar-friendly meal plans.", diet_heart:"Heart Health Plan", diet_heart_desc:"Cardio-protective nutrition.", diet_pregnancy:"Pregnancy Nutrition", diet_pregnancy_desc:"Safe, nutrient-dense plans for mothers.", diet_sports:"Sports Performance", diet_sports_desc:"High-protein plans for athletes.", get_started:"Get Started →", consult_title:"Nutrition Consulting", consult_desc:"Book a one-on-one session with our certified nutritionist.", consult_btn:"Book Consultation", about_title:"About U-NiceNutraCare", about_sub:"Nairobi's trusted natural wellness shop, committed to organic products and community health.", about_mission:"Our Mission", about_mission_desc:"To make natural wellness accessible to every Kenyan household through affordable, certified organic products.", about_quality:"Quality First", about_quality_desc:"Every product is tested and certified. We partner with local farmers who share our commitment to organic practices.", about_community:"Community Impact", about_community_desc:"Supporting local farmers and sustainable agriculture while promoting health education across communities.", testimonial_title:"What Our Customers Say", testimonial_sub:"Real reviews from our valued customers", contact_title:"Get In Touch", contact_sub:"Reach out via WhatsApp, phone, or fill the form.", contact_name:"Your Name", contact_phone:"Phone Number", contact_interest_default:"I'm interested in...", contact_message:"Your Message", contact_submit:"Send Message via WhatsApp", contact_hours:"Mon–Sat: 8am – 6pm", contact_hours_sub:"Closed on Sundays", contact_form_title:"Send a Message", blog_title:"Wellness Tips & Blog", blog_sub:"Expert advice for your natural health journey", blog_article:"Article", blog_read_more:"Read More →", blog_read_time:"min read", newsletter_tag:"Join Our Community", newsletter_title:"Get Wellness Tips &\nExclusive Offers", newsletter_sub:"Subscribe for nutrition advice and special discounts.", newsletter_placeholder:"Enter your email", newsletter_btn:"Subscribe Now", newsletter_note:"No spam, unsubscribe anytime. Join 2,000+ subscribers.", footer_desc:"Nairobi's trusted natural wellness shop. Fresh seedlings, medicinal herbs, spices, kefir, kombucha & nutrition consulting.", footer_quick_links:"Quick Links", footer_categories:"Categories", footer_contact:"Contact", footer_payment:"We accept:", recently_viewed:"Recently Viewed", order_now:"Order Now", wishlist_title:"My Wishlist", wishlist_empty:"Your wishlist is empty", wishlist_empty_sub:"Tap the heart icon on products you love!", wishlist_browse:"Browse Products", account_title:"My Account", account_profile:"Personal Information", account_name:"Full Name", account_phone:"Phone Number", account_email:"Email Address", account_address:"Delivery Address", account_save:"Save Profile", account_history:"Order History", account_no_orders:"No orders yet. Start shopping!", account_clear:"Clear Saved Data", account_msg_saved:"✓ Profile saved", account_msg_cleared:"✓ Profile cleared", pwa_title:"Install U-NiceNutraCare", pwa_sub:"Add to home screen for faster shopping", pwa_install_btn:"Install", notif_title:"Stay Updated!", notif_sub:"Get notified about flash sales & new arrivals", notif_enable:"Enable", cookie_text:"We use cookies to improve your experience.", cookie_accept:"Accept", cookie_learn:"Learn More", toast_added:"added to cart", toast_removed:"removed from cart", toast_wishlist_added:"Added to wishlist", toast_wishlist_removed:"Removed from wishlist", toast_profile_saved:"Profile saved!", toast_share_copied:"Link copied to clipboard!" },
      sw: { tagline:"Asili · Organic · Lishe", mobile_subtitle:"Duka la Afya Asili", nav_home:"Nyumbani", nav_categories:"Makundi", nav_products:"Bidhaa", nav_flash:"Flash Sale", nav_nutrition:"Lishe", nav_about:"Kuhusu Sisi", nav_contact:"Wasiliana", hero_shop:"Nunua Sasa", hero_explore:"Chunguza Mimea", hero_powders:"Nunua Viungo", hero_slide1_tag:"Mkusanyiko Mpya", hero_slide1_title:"Miche Mpya\nKwa Bustani Yako", hero_slide1_sub:"Miche yenye afya njia tayari kwa kupandwa. Nyanya, sukuma wiki, mimea, na zaidi.", hero_slide2_tag:"Mimea ya Dawa", hero_slide2_title:"Pona kwa\nNguvu ya Asili", hero_slide2_sub:"Moringa, Tulsi, Rosemary iliyovunwa mkononi. Ililimwa ndani, bila kemikali.", hero_slide3_tag:"Viungo na Probiotics", hero_slide3_title:"Viungo Bora\nna Kombucha", hero_slide3_sub:"Manjano, Tangawizi, Kefir, Kombucha — safi kutoka Kiambu kwa afya ya kila siku.", shop_by_category:"Nunua kwa Kikundi", view_all:"Ona Zote →", cat_seedlings:"Miche", cat_herbs:"Mimea Freshi", cat_spices:"Viiongezeo na Viungo", cat_kefir:"Kefir na Kombucha", cat_diet:"Mpango wa Chakula", cat_consult:"Ushauri", trust_natural:"100% Asili", trust_natural_sub:"Bidhaa zilizoidhinishwa", trust_delivery:"Usambazaji Bure", trust_delivery_sub:"Kwa amizisho zaidi ya KSh 2,000", trust_support:"Msaada 24/7", trust_support_sub:"WhatsApp na simu", trust_returns:"Rudisha Rahisi", trust_returns_sub:"Sera ya kurudisha siku 7", seedlings_title:"Miche Mpya", seedlings_sub:"Miche yenye afya tayari kwa kupandwa", herbs_title:"Mimea Freshi", herbs_sub:"Ilivunwa mkononi, bila kemikali", spices_title:"Viungo na Viongezeo", spices_sub:"Viungo vilivyochanganywa kwa afya ya kila siku", kefir_title:"Kefir na Kombucha", kefir_sub:"Probiotics za kultur hai zilizotengenezwa kila wiki", see_all:"Ona Zote →", flash_title:"Flash Sale", flash_sub:"Ofa za muda kwenye bidhaa maarufu", all_products:"Bidhaa Zote", filter_all:"Zote", filter_seedlings:"Miche", filter_herbs:"Mimea Freshi", filter_spices:"Viungo", filter_kefir:"Kombucha", sort_popular:"Maarufu", sort_price_low:"Bei: Chini→Juu", sort_price_high:"Bei: Juu→Chini", sort_rating:"Yenye Ukadiriaji Bora", sort_newest:"Mpya", price_under200:"Chini ya KSh 200", price_200_400:"KSh 200-400", price_over400:"KSh 400+", search_placeholder:"Tafuta miche, mimea, viungo, probiotics...", search_empty:"Hakuna bidhaa zilizopatikana", search_empty_sub:"Jaribu neno lingine", search_clear:"Futa Utafutaji", cart_title:"Kikapu Chako", cart_empty:"Kikapu chako ni tupu", cart_empty_sub:"Ongeza bidhaa kuanza!", cart_continue:"Endelea Kununua", cart_subtotal:"Jumla", cart_delivery_cost:"Usambazaji", cart_free_delivery:"Bure zaidi ya KSh 2,000", cart_discount:"Punguzo", cart_total:"Jumla", cart_clear:"Futa Kikapu", cart_promo_placeholder:"Msimbo wa promo", cart_promo_apply:"Tumia", cart_promo_applied:"✓ Promo imetumika:", cart_promo_invalid:"✕ Msimbo si sahihi", cart_location:"Mahali pa Usambazaji:", cart_location_nairobi:"Nairobi", cart_location_other:"Nyingine Kenya", pd_benefits:"Faida", pd_reviews:"Maoni", pd_write_review:"Andika Maoni", pd_name_placeholder:"Jina lako", pd_submit_review:"Wasilisha", pd_stock:"kwenye hisa", pd_low_stock:"Hisa ndogo —", pd_add_cart:"Ongeza Kikapu", pd_add_wishlist:"Ongeza Orodha", pd_share:"Shiriki", pd_in_stock:"Kwenye Hisa", nutrition_title:"Mpango Wako wa Afya", nutrition_sub:"Mwongozo wa lishe unaolingana na mwili wako.", diet_weightloss:"Mpango wa Kupunguza Uzito", diet_weightloss_desc:"Vitafunio vilivyobinafsishwa kwa kalori.", diet_immunity:"Mpango wa Kuimarisha Kinga", diet_immunity_desc:"Imarisha mfumo wako wa kinga.", diet_diabetes:"Usimamizi wa Kisukari", diet_diabetes_desc:"Vitafunio vinavyolingana na sukari.", diet_heart:"Afya ya Moyo", diet_heart_desc:"Lishe inayolinda moyo.", diet_pregnancy:"Lishe ya Ujauzito", diet_pregnancy_desc:"Mpango salama kwa watoto wachanga.", diet_sports:"Utendaji wa Michezo", diet_sports_desc:"Mpango wa protini kwa wachezaji.", get_started:"Anza Sasa →", consult_title:"Ushauri wa Lishe", consult_desc:"Weka miadi na mshauri wetu wa lishe.", consult_btn:"Weka Miadi", about_title:"Kuhusu U-NiceNutraCare", about_sub:"Duka la afya la asili linaloaminika Nairobi.", about_mission:"Dhamira Yetu", about_mission_desc:"Kufanya afya ya asili ipatikane kwa kila nyumba ya Kenya.", about_quality:"Ubora Kwanza", about_quality_desc:"Kila bidhaa imeshikamishwa na kuthibitishwa.", about_community:"Athari ya Jamii", about_community_desc:"Kusaidia wakulima na kilimo endelevu.", testimonial_title:"Mteja Wetu Anasema Nini", testimonial_sub:"Maoni halisi kutoka kwa wateja wetu", contact_title:"Wasiliana Nasi", contact_sub:"Maswali? Wasiliana kupitia WhatsApp, simu, au jaza fomu.", contact_name:"Jina Lako", contact_phone:"Nambari ya Simu", contact_interest_default:"Ninavutiwa na...", contact_message:"Ujumbe Wako", contact_submit:"Tuma Ujumbe kupitia WhatsApp", contact_hours:"Jumatatu-Jumamosi: 8am – 6pm", contact_hours_sub:"Imefungwa Jumapili", contact_form_title:"Tuma Ujumbe", blog_title:"Vidokezo vya Afya na Blog", blog_sub:"Ushauri wa kitaalamu kwa safari yako ya afya", blog_article:"Makala", blog_read_more:"Soma Zaidi →", blog_read_time:"dakika za kusoma", newsletter_tag:"Jiunge Nasi", newsletter_title:"Pata Vidokezo vya Afya &\nOfa Maalum", newsletter_sub:"Jiandikisha kwa ushauri wa lishe na ofa maalum.", newsletter_placeholder:"Weka barua pepe yako", newsletter_btn:"Jiandikisha Sasa", newsletter_note:"Hakuna spam, jiondoa wakati wowote.", footer_desc:"Duka la afya la asili linaloaminika Nairobi.", footer_quick_links:"Viungo vya Haraka", footer_categories:"Makundi", footer_contact:"Wasiliana", footer_payment:"Tunakubali:", recently_viewed:"Imeonekana Hivi Karibuni", order_now:"Nunua Sasa", wishlist_title:"Orodha Yangu", wishlist_empty:"Orodha yako ni tupu", wishlist_empty_sub:"Gusa ikoni ya moyo kwenye unachopenda!", wishlist_browse:"Vinjari Bidhaa", account_title:"Akaunti Yangu", account_profile:"Taarifa Binafsi", account_name:"Jina Kamili", account_phone:"Nambari ya Simu", account_email:"Barua Pepe", account_address:"Anwani ya Usambazaji", account_save:"Hifadhi Wasifu", account_history:"Historia ya Maagizo", account_no_orders:"Hakuna maagizo bado.", account_clear:"Futa Taarifa Zilizohifadhiwa", account_msg_saved:"✓ Umehifadhiwa", account_msg_cleared:"✓ Umefutwa", pwa_title:"Sakinisha U-NiceNutraCare", pwa_sub:"Ongeza kwenye skrini ya nyumbani", pwa_install_btn:"Sakinisha", notif_title:"Kaa Sasishwa!", notif_sub:"Pata arifa kuhusu flash sales na bidhaa mpya", notif_enable:"Washa", cookie_text:"Tunatumia cookies kuboresha uzoefu wako.", cookie_accept:"Kubali", cookie_learn:"Jifunze Zaidi", toast_added:"imeongezwa kikapuni", toast_removed:"imeondolewa kikapuni", toast_wishlist_added:"Imeongezwa kwenye orodha", toast_wishlist_removed:"Imeondolewa kwenye orodha", toast_profile_saved:"Umehifadhiwa!", toast_share_copied:"Kiungo kunakwisha!" },
      fr: { tagline:"Naturel · Biologique · Nutritif", mobile_subtitle:"Boutique Bien-être Naturel", nav_home:"Accueil", nav_categories:"Catégories", nav_products:"Produits", nav_flash:"Vente Flash", nav_nutrition:"Nutrition", nav_about:"À Propos", nav_contact:"Contact", hero_shop:"Acheter", hero_explore:"Découvrir les Herbes", hero_powders:"Épices", hero_slide1_tag:"Nouvelle Collection", hero_slide1_title:"Plants Frais\nPour Votre Jardin", hero_slide1_sub:"Plants sains et bien entretenus prêts à être plantés. Tomates, choux, herbes et plus.", hero_slide2_tag:"Herbes Médicinales", hero_slide2_title:"Guérissez avec\nla Puissance de la Nature", hero_slide2_sub:"Moringa, Tulsi, Rosemary récoltées à la main. Cultivées localement, sans pesticides.", hero_slide3_tag:"Épices & Probiotiques", hero_slide3_title:"Épices Premium\n& Kombucha", hero_slide3_sub:"Curcumbre, Gingembre, Kéfir, Kombucha — frais de Kiambu pour le bien-être quotidien.", shop_by_category:"Acheter par Catégorie", view_all:"Voir Tout →", cat_seedlings:"Plants", cat_herbs:"Herbes Fraîches", cat_spices:"Épices & Compléments", cat_kefir:"Kéfir & Kombucha", cat_diet:"Régimes", cat_consult:"Consultation", trust_natural:"100% Naturel", trust_natural_sub:"Produits certifiés biologiques", trust_delivery:"Livraison Gratuite", trust_delivery_sub:"Pour les commandes > 2 000 KSh", trust_support:"Support 24/7", trust_support_sub:"WhatsApp et téléphone", trust_returns:"Retours Faciles", trust_returns_sub:"Politique de retour 7 jours", seedlings_title:"Plants Frais", seedlings_sub:"Plants sains prêts à être plantés", herbs_title:"Herbes Fraîches", herbs_sub:"Récoltées à la main, sans pesticides", spices_title:"Épices & Compléments", spices_sub:"Épices pures pour la santé quotidienne", kefir_title:"Kéfir & Kombucha", kefir_sub:"Probiotiques vivants fabriqués chaque semaine", see_all:"Voir Tout →", flash_title:"Vente Flash", flash_sub:"Offres limitées sur les produits populaires", all_products:"Tous les Produits", filter_all:"Tous", filter_seedlings:"Plants", filter_herbs:"Herbes Fraîches", filter_spices:"Épices", filter_kefir:"Kombucha", sort_popular:"Populaire", sort_price_low:"Prix: Croissant", sort_price_high:"Prix: Décroissant", sort_rating:"Mieux Notés", sort_newest:"Nouveautés", price_under200:"Moins de 200 KSh", price_200_400:"200-400 KSh", price_over400:"400 KSh+", search_placeholder:"Rechercher plants, herbes, épices...", search_empty:"Aucun produit trouvé", search_empty_sub:"Essayez un autre terme", search_clear:"Effacer la Recherche", cart_title:"Votre Panier", cart_empty:"Votre panier est vide", cart_empty_sub:"Ajoutez des produits!", cart_continue:"Continuer les Achats", cart_subtotal:"Sous-total", cart_delivery_cost:"Livraison", cart_free_delivery:"Gratuit > 2 000 KSh", cart_discount:"Remise", cart_total:"Total", cart_clear:"Vider le Panier", cart_promo_placeholder:"Code promo", cart_promo_apply:"Appliquer", cart_promo_applied:"✓ Promo appliquée:", cart_promo_invalid:"✕ Code promo invalide", cart_location:"Lieu de Livraison:", cart_location_nairobi:"Nairobi", cart_location_other:"Autre Kenya", pd_benefits:"Avantages", pd_reviews:"Avis", pd_write_review:"Écrire un Avis", pd_name_placeholder:"Votre nom", pd_submit_review:"Soumettre", pd_stock:"en stock", pd_low_stock:"Stock faible — seulement", pd_add_cart:"Ajouter au Panier", pd_add_wishlist:"Ajouter aux Favoris", pd_share:"Partager", pd_in_stock:"En Stock", nutrition_title:"Votre Plan Bien-être Personnalisé", nutrition_sub:"Conseils nutritionnels basés sur la science.", diet_weightloss:"Perte de Poids", diet_weightloss_desc:"Repas personnalisés à base de produits locaux.", diet_immunity:"Renforcement Immunitaire", diet_immunity_desc:"Renforcez votre système immunitaire.", diet_diabetes:"Gestion du Diabète", diet_diabetes_desc:"Repas adaptés à la glycémie.", diet_heart:"Santé Cardiaque", diet_heart_desc:"Nutrition protectrice pour le cœur.", diet_pregnancy:"Nutrition Grossesse", diet_pregnancy_desc:"Plans sûrs pour les mamans.", diet_sports:"Performance Sportive", diet_sports_desc:"Plans riches en protéines pour athlètes.", get_started:"Commencer →", consult_title:"Consultation Nutrition", consult_desc:"Réservez une session avec notre nutritionniste.", consult_btn:"Réserver", about_title:"À Propos d'U-NiceNutraCare", about_sub:"Boutique bien-être naturel de confiance à Nairobi.", about_mission:"Notre Mission", about_mission_desc:"Rendre le bien-être naturel accessible à chaque foyer.", about_quality:"Qualité d'Abord", about_quality_desc:"Chaque produit est testé et certifié.", about_community:"Impact Communautaire", about_community_desc:"Soutenir les agriculteurs locaux.", testimonial_title:"Ce que Disent Nos Clients", testimonial_sub:"Vrais avis de nos clients", contact_title:"Contactez-Nous", contact_sub:"Des questions? WhatsApp, téléphone, ou formulaire.", contact_name:"Votre Nom", contact_phone:"Numéro de Téléphone", contact_interest_default:"Je suis intéressé par...", contact_message:"Votre Message", contact_submit:"Envoyer via WhatsApp", contact_hours:"Lun-Sam: 8h – 18h", contact_hours_sub:"Fermé le dimanche", contact_form_title:"Envoyer un Message", blog_title:"Conseils Bien-être & Blog", blog_sub:"Conseils d'experts pour votre parcours santé", blog_article:"Article", blog_read_more:"Lire Plus →", blog_read_time:"min de lecture", newsletter_tag:"Rejoignez-Nous", newsletter_title:"Conseils Bien-être &\nOffres Exclusives", newsletter_sub:"Inscrivez-vous pour des conseils et des réductions.", newsletter_placeholder:"Votre email", newsletter_btn:"S'inscrire", newsletter_note:"Pas de spam. 2 000+ abonnés.", footer_desc:"Boutique bien-être naturel de confiance à Nairobi.", footer_quick_links:"Liens Rapides", footer_categories:"Catégories", footer_contact:"Contact", footer_payment:"Nous acceptons:", recently_viewed:"Récemment Consultés", order_now:"Commander", wishlist_title:"Mes Favoris", wishlist_empty:"Votre liste est vide", wishlist_empty_sub:"Appuyez sur le cœur!", wishlist_browse:"Parcourir", account_title:"Mon Compte", account_profile:"Informations Personnelles", account_name:"Nom Complet", account_phone:"Téléphone", account_email:"Email", account_address:"Adresse de Livraison", account_save:"Sauvegarder", account_history:"Historique des Commandes", account_no_orders:"Aucune commande.", account_clear:"Effacer les Données", account_msg_saved:"✓ Sauvegardé", account_msg_cleared:"✓ Effacé", pwa_title:"Installer U-NiceNutraCare", pwa_sub:"Ajoutez à l'écran d'accueil", pwa_install_btn:"Installer", notif_title:"Restez Informé!", notif_sub:"Notifications pour ventes flash et nouveautés", notif_enable:"Activer", cookie_text:"Nous utilisons des cookies.", cookie_accept:"Accepter", cookie_learn:"En Savoir Plus", toast_added:"ajouté au panier", toast_removed:"retiré du panier", toast_wishlist_added:"Ajouté aux favoris", toast_wishlist_removed:"Retiré des favoris", toast_profile_saved:"Profil sauvegardé!", toast_share_copied:"Lien copié!" }
    };
    const t = (key) => (translations[state.lang] && translations[state.lang][key]) || translations.en[key] || key;
    const updateText = () => {
      document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.getAttribute('data-i18n')); });
      document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.getAttribute('data-i18n-placeholder')); });
      document.documentElement.lang = state.lang;
      document.querySelectorAll('.lang-btn').forEach(btn => {
        const isActive = btn.dataset.lang === state.lang;
        btn.classList.toggle('bg-primary', isActive);
        btn.classList.toggle('text-white', isActive);
        btn.classList.toggle('bg-gray-100', !isActive);
        btn.classList.toggle('text-paragraph', !isActive);
        btn.setAttribute('aria-checked', isActive);
      });
    };
    const setLanguage = (lang) => {
      state.lang = lang;
      updateText();
      Products.renderCarousels();
      Products.renderGrid();
      Wishlist.render();
      Blog.render();
      Cart.updateUI();
    };
    return { t, setLanguage, updateText };
  })();

  // ===== MODULE: Toast =====
  const Toast = (() => {
    const show = (msg, icon = '✓') => {
      const el = document.createElement('div');
      el.className = 'bg-heading text-white text-sm font-semibold px-5 py-3 rounded-full shadow-lg flex items-center gap-2 toast-enter';
      el.innerHTML = `<span>${icon}</span> ${msg}`;
      document.getElementById('toastStack').appendChild(el);
      setTimeout(() => { el.classList.remove('toast-enter'); el.classList.add('toast-exit'); }, 2000);
      setTimeout(() => el.remove(), 2300);
    };
    return { show };
  })();

  // ===== MODULE: Products (API-backed) =====
  const Products = (() => {
    const getEmoji = (name) => {
      const map = { 'Triple Strength Omega-3 Fish Oil':'🐟', 'Aged Garlic Extract':'🧄', 'Blood Circulation Flow':'❤️', 'Dried Hawthorn Berries':'🫐', 'N-Acetyl Cysteine (NAC)':'🧬', 'Selenium 200mcg':'🔬', 'Sugar Balance & Chromium Picolinate':'🍬', 'Calcium Magnesium Zinc + D3':'🦴', 'Triple Magnesium Complex':'💊', 'High Potency Zinc (50mg)':'⚡', 'Lion's Mane Liquid Extract':'🦁', 'Rhodiola Rosea':'🌸', 'Shilajit Complex':'🏔️', 'Myo & D-Chiro Inositol':'👩', 'Women's Probiotic & Vaginal Health Gummies':'🍓' };
      return map[name] || '📦';
    };
    const getName = (p) => p[`name_${state.lang}`] || p.name_en || '';
    const getUnit = (p) => p[`unit_${state.lang}`] || p.unit_en || '';
    const getDesc = (p) => p[`desc_${state.lang}`] || p.desc_en || '';
    const getBenefits = (p) => { try { return JSON.parse(p[`benefits_${state.lang}`] || p.benefits_en || '[]'); } catch { return []; } };
    const inStock = (p) => p.stock > 0;

    const renderCard = (p, opts = {}) => {
      const badges = Array.isArray(p.badges) ? p.badges : JSON.parse(p.badges || '[]');
      const badge = badges.length ? `<span class="absolute top-2 left-2 ${badges[0]==='Popular'||badges[0]==='Bestseller' ? 'bg-primary' : badges[0]==='New' ? 'bg-emerald-500' : badges[0]==='Premium' ? 'bg-secondary' : 'bg-flash'} text-white text-[10px] font-bold px-2 py-0.5 rounded-full">${badges[0]}</span>` : '';
      const price = opts.flashPrice || p.price;
      const origPrice = p.original_price || (opts.flashPrice ? p.price : null);
      const origHtml = origPrice ? `<span class="text-xs text-gray-400 line-through">${CURRENCY} ${origPrice}</span>` : '';
      const btnAction = opts.flash ? `App.Cart.add('${getName(p)}',${price},${p.id})` : `App.Products.openDetail(${p.id})`;
      return `<div class="swiper-slide"><div class="product-card bg-white rounded-2xl shadow-card border border-gray-50 overflow-hidden group cursor-pointer" onclick="${btnAction}" data-cat="${p.category}">
        <div class="product-img relative h-40 sm:h-48 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
          <div class="skeleton absolute inset-0"></div>
          <img loading="lazy" src="${p.image_url}" alt="${getName(p)}" class="w-full h-full object-cover relative z-10 opacity-0 transition-opacity duration-300" onload="this.classList.remove('opacity-0');this.previousElementSibling.classList.add('hidden')">
          ${badge}
        </div>
        <div class="p-3"><p class="text-sm font-semibold text-heading line-clamp-1 group-hover:text-primary transition">${getName(p)}</p><p class="text-xs text-paragraph mt-0.5">${getUnit(p)}</p><div class="flex items-center justify-between mt-2"><div><span class="font-display font-bold text-primary text-sm">${CURRENCY} ${price}</span> ${origHtml}</div><button class="bg-primary text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-primary-dark transition haptic" onclick="event.stopPropagation();App.Cart.add('${getName(p)}',${price},${p.id})">${I18n.t('pd_add_cart')}</button></div></div>
      </div></div>`;
    };

    const renderCarousels = async () => {
      if (!state.productsLoaded) await fetchProducts();
      const cats = { seedlings:'seedlingsCarousel', herbs:'herbsCarousel', spices:'spicesCarousel', kefir:'kefirCarousel' };
      for (const [cat, id] of Object.entries(cats)) {
        const el = document.getElementById(id);
        if (el) el.innerHTML = state.products.filter(p => p.category === cat).map(p => renderCard(p)).join('');
      }
    };

    const renderGrid = async () => {
      const grid = document.getElementById('product-grid');
      const empty = document.getElementById('searchEmpty');
      const countEl = document.getElementById('productCount');
      if (!state.productsLoaded) await fetchProducts();
      if (state.products.length === 0) {
        if (grid) grid.innerHTML = '';
        if (empty) empty.classList.remove('hidden');
      } else {
        if (empty) empty.classList.add('hidden');
        if (grid) grid.innerHTML = state.products.map(p => {
          const badges = Array.isArray(p.badges) ? p.badges : JSON.parse(p.badges || '[]');
          const badge = badges.length ? `<span class="absolute top-2 left-2 ${badges[0]==='Popular'||badges[0]==='Bestseller' ? 'bg-primary' : badges[0]==='New' ? 'bg-emerald-500' : badges[0]==='Premium' ? 'bg-secondary' : 'bg-flash'} text-white text-[10px] font-bold px-2 py-0.5 rounded-full">${badges[0]}</span>` : '';
          return `<div class="product-card bg-white rounded-2xl shadow-card border border-gray-50 overflow-hidden group cursor-pointer" onclick="App.Products.openDetail(${p.id})" data-cat="${p.category}">
            <div class="product-img relative h-36 sm:h-44 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
              <div class="skeleton absolute inset-0"></div>
              <img loading="lazy" src="${p.image_url}" alt="${getName(p)}" class="w-full h-full object-cover relative z-10 opacity-0 transition-opacity duration-300" onload="this.classList.remove('opacity-0');this.previousElementSibling.classList.add('hidden')">
              ${badge}
            </div>
            <div class="p-3"><p class="text-sm font-semibold text-heading line-clamp-1 group-hover:text-primary transition">${getName(p)}</p><p class="text-xs text-paragraph mt-0.5">${getUnit(p)}</p><div class="flex items-center justify-between mt-2"><span class="font-display font-bold text-primary text-sm">${CURRENCY} ${p.price}</span><button class="bg-primary text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-primary-dark transition haptic" onclick="event.stopPropagation();App.Cart.add('${getName(p)}',${p.price},${p.id})">Add</button></div></div>
          </div>`;
        }).join('');
      }
      if (countEl) countEl.textContent = `${state.products.length} products`;
    };

    const filter = (cat, btn) => {
      state.category = cat;
      state.productsLoaded = false;
      document.querySelectorAll('.tab-btn').forEach(b => { b.classList.remove('active','bg-primary','text-white','border-primary'); b.classList.add('bg-white','text-paragraph','border-gray-200'); });
      if (btn) { btn.classList.add('active','bg-primary','text-white','border-primary'); btn.classList.remove('bg-white','text-paragraph','border-gray-200'); }
      renderGrid();
    };
    const sort = (val) => { state.sort = val; state.productsLoaded = false; renderGrid(); };
    const filterPrice = (range) => {
      state.priceRange = state.priceRange === range ? null : range;
      state.productsLoaded = false;
      document.querySelectorAll('.price-filter-btn').forEach(b => {
        b.classList.remove('active');
        if (state.priceRange && b.getAttribute('onclick')?.includes(state.priceRange)) b.classList.add('active');
      });
      renderGrid();
    };

    const openDetail = async (id) => {
      const p = await fetchProduct(id);
      if (!p) return;
      trackRecent(id);
      const name = getName(p);
      const benefits = getBenefits(p);
      const badges = Array.isArray(p.badges) ? p.badges : JSON.parse(p.badges || '[]');
      document.getElementById('productDetailBody').innerHTML = `
        <div class="relative"><img loading="lazy" src="${p.image_url}" alt="${name}" class="w-full h-56 object-cover">
          <button onclick="App.Products.closeDetail()" class="absolute top-4 right-4 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md haptic"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
        <div class="p-5">
          <div class="flex items-center gap-2 mb-2"><span class="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">${p.category}</span><div class="text-secondary text-xs">★ ${p.rating} (${p.review_count})</div></div>
          <h2 class="font-display font-bold text-heading text-xl mb-1">${name}</h2>
          <p class="text-paragraph text-sm mb-3">${getDesc(p)}</p>
          <div class="flex items-center gap-3 mb-4"><span class="font-display font-bold text-primary text-2xl">${CURRENCY} ${p.price}</span>${p.original_price ? `<span class="text-sm text-gray-400 line-through">${CURRENCY} ${p.original_price}</span>` : ''}</div>
          <p class="text-xs ${p.stock > 10 ? 'text-green-600' : p.stock > 0 ? 'text-orange-500' : 'text-red-500'} mb-4">${p.stock > 10 ? I18n.t('pd_in_stock') + ' (' + p.stock + ' ' + I18n.t('pd_stock') + ')' : p.stock > 0 ? I18n.t('pd_low_stock') + ' ' + p.stock + ' ' + I18n.t('pd_stock') : 'Out of stock'}</p>
          <div class="flex gap-2 mb-5">
            <button onclick="App.Cart.add('${name}',${p.price},${p.id})" class="flex-1 bg-primary text-white font-bold text-sm py-3 rounded-full hover:bg-primary-dark transition haptic">${I18n.t('pd_add_cart')}</button>
            <button onclick="App.Wishlist.toggle(${p.id})" class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center hover:bg-red-50 transition haptic"><svg class="w-5 h-5 ${state.wishlist.includes(p.id) ? 'text-red-500 fill-current' : 'text-gray-400'}" fill="${state.wishlist.includes(p.id) ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg></button>
            <button onclick="App.Share.product(${p.id})" class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition haptic"><svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg></button>
          </div>
          <div class="mb-4"><h3 class="font-semibold text-heading text-sm mb-2">${I18n.t('pd_benefits')}</h3><ul class="space-y-1.5">${benefits.map(b => `<li class="flex items-start gap-2 text-sm text-paragraph"><span class="text-primary mt-0.5">✓</span>${b}</li>`).join('')}</ul></div>
          <div class="border-t border-gray-100 pt-4"><h3 class="font-semibold text-heading text-sm mb-3">${I18n.t('pd_reviews')} (${(p.reviews || []).length})</h3>
            <form onsubmit="App.Reviews.submit(event,${p.id})" class="bg-gray-50 rounded-xl p-3 mb-3 space-y-2">
              <input type="text" id="reviewName" placeholder="${I18n.t('pd_name_placeholder')}" class="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" required>
              <div class="flex gap-1" id="reviewStars">${[1,2,3,4,5].map(s => `<span class="review-star text-gray-300" data-star="${s}" onclick="App.Reviews.setStar(${s})">☆</span>`).join('')}</div>
              <textarea id="reviewComment" rows="2" placeholder="${I18n.t('pd_write_review')}" class="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"></textarea>
              <button type="submit" class="bg-primary text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-primary-dark transition haptic">${I18n.t('pd_submit_review')}</button>
            </form>
            <div class="space-y-2">${(p.reviews || []).map(r => `<div class="bg-gray-50 rounded-xl p-3"><div class="flex items-center justify-between mb-1"><span class="font-semibold text-heading text-xs">${r.user_name}</span><span class="text-secondary text-xs">${'★'.repeat(r.rating)}</span></div><p class="text-paragraph text-xs">${r.comment}</p></div>`).join('')}</div>
          </div>
        </div>`;
      document.getElementById('productDetailModal').classList.remove('-translate-x-full');
      document.body.style.overflow = 'hidden';
    };
    const closeDetail = () => { document.getElementById('productDetailModal').classList.add('-translate-x-full'); document.body.style.overflow = ''; };
    const trackRecent = (id) => {
      let r = state.recent.filter(x => x !== id);
      r.unshift(id);
      if (r.length > 8) r = r.slice(0, 8);
      state.recent = r;
      renderRecent();
    };
    const renderRecent = () => {
      const section = document.getElementById('recentlyViewedSection');
      const grid = document.getElementById('recentlyViewedGrid');
      if (!section || !grid) return;
      if (!state.recent || state.recent.length === 0) { section.classList.add('hidden'); return; }
      section.classList.remove('hidden');
      grid.innerHTML = state.recent.map(id => {
        const p = state.products.find(x => x.id === id);
        if (!p) return '';
        return `<div class="bg-white rounded-2xl shadow-card border border-gray-50 overflow-hidden group cursor-pointer haptic" onclick="App.Products.openDetail(${p.id})"><div class="product-img relative h-36 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden"><div class="skeleton absolute inset-0"></div><img loading="lazy" src="${p.image_url}" alt="${getName(p)}" class="w-full h-full object-cover relative z-10 opacity-0 transition-opacity duration-300" onload="this.classList.remove('opacity-0');this.previousElementSibling.classList.add('hidden')"></div><div class="p-3"><p class="text-sm font-semibold text-heading line-clamp-1 group-hover:text-primary transition">${getName(p)}</p><p class="font-display font-bold text-primary text-sm mt-1">${CURRENCY} ${p.price}</p></div></div>`;
      }).join('');
    };

    return { renderCard, renderCarousels, renderGrid, filter, sort, filterPrice, openDetail, closeDetail, getName, getEmoji, getDesc, getBenefits, inStock, renderRecent, fetchProducts, fetchProduct };
  })();

  // ===== MODULE: Cart (API-backed orders · Paystack) =====
  const Cart = (() => {
    let paystackKey = '';

    const getCount = () => state.cart.reduce((s, i) => s + i.qty, 0);
    const getTotal = () => state.cart.reduce((s, i) => s + (i.price * i.qty), 0);

    const add = (name, price, productId) => {
      const item = state.cart.find(i => i.name === name);
      if (item) { item.qty += 1; state.cart = [...state.cart]; }
      else { state.cart = [...state.cart, { name, price: parseInt(price), qty: 1, productId: productId || null }]; }
      Toast.show(`${name} ${I18n.t('toast_added')}`);
      const badge = document.getElementById('cartCount');
      if (badge) { badge.classList.remove('cart-bounce'); void badge.offsetWidth; badge.classList.add('cart-bounce'); }
      updateUI();
    };
    const remove = (name) => { state.cart = state.cart.filter(i => i.name !== name); Toast.show(`${name} ${I18n.t('toast_removed')}`, '🗑️'); updateUI(); };
    const updateQty = (name, delta) => {
      const item = state.cart.find(i => i.name === name);
      if (!item) return;
      item.qty += delta;
      if (item.qty <= 0) { remove(name); return; }
      state.cart = [...state.cart];
      updateUI();
    };
    const clear = () => { state.cart = []; updateUI(); };

    const calculateDelivery = (subtotal) => {
      if (subtotal >= 2000) return 0;
      return state.cart._location === 'nairobi' ? 200 : 350;
    };

    const updateUI = () => {
      const count = getCount();
      const subtotal = getTotal();
      const delivery = calculateDelivery(subtotal);
      const total = Math.max(0, subtotal + delivery);
      ['cartCount','cartCountHeader','cartCountMobile'].forEach(id => { const el = document.getElementById(id); if (el) { el.textContent = count; el.classList.toggle('hidden', count === 0); } });
      const container = document.getElementById('cartItems');
      const empty = document.getElementById('cartEmpty');
      const footer = document.getElementById('cartFooter');
      if (!container) return;
      container.querySelectorAll('.cart-item').forEach(el => el.remove());
      if (count === 0) { empty.classList.remove('hidden'); footer.classList.add('hidden'); return; }
      empty.classList.add('hidden'); footer.classList.remove('hidden');
      state.cart.forEach(item => {
        const emoji = Products.getEmoji(item.name);
        const div = document.createElement('div');
        div.className = 'cart-item flex items-center gap-3 p-3 bg-gray-50 rounded-xl';
        div.innerHTML = `<div class="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-2xl shrink-0 border border-gray-100">${emoji}</div><div class="flex-1 min-w-0"><p class="text-sm font-semibold text-heading line-clamp-1">${item.name}</p><p class="text-xs text-paragraph">${CURRENCY} ${item.price.toLocaleString()} each</p><div class="flex items-center gap-2 mt-1.5"><button onclick="App.Cart.updateQty('${item.name.replace(/'/g,"\\'")}',-1)" class="w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-500 hover:border-primary hover:text-primary transition haptic">−</button><span class="text-sm font-semibold text-heading min-w-[20px] text-center">${item.qty}</span><button onclick="App.Cart.updateQty('${item.name.replace(/'/g,"\\'")}',1)" class="w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-500 hover:border-primary hover:text-primary transition haptic">+</button></div></div><div class="text-right shrink-0"><p class="text-sm font-bold text-primary">${CURRENCY} ${(item.price * item.qty).toLocaleString()}</p><button onclick="App.Cart.remove('${item.name.replace(/'/g,"\\'")}')" class="text-[10px] text-red-400 hover:text-red-600 mt-1 transition">${I18n.t('cart_clear').includes('Clear') ? 'Remove' : 'Ondoa'}</button></div>`;
        container.appendChild(div);
      });
      document.getElementById('cartSubtotal').textContent = `${CURRENCY} ${subtotal.toLocaleString()}`;
      document.getElementById('cartTotal').textContent = `${CURRENCY} ${total.toLocaleString()}`;
      const deliveryEl = document.getElementById('cartDeliveryLine');
      if (deliveryEl) deliveryEl.innerHTML = delivery === 0 ? `<span class="text-green-600">${I18n.t('cart_free_delivery')}</span>` : `<span>${CURRENCY} ${delivery}</span>`;
    };

    const open = () => { document.getElementById('cartDrawer').classList.remove('-translate-x-full'); document.body.style.overflow = 'hidden'; updateUI(); };
    const close = () => { document.getElementById('cartDrawer').classList.add('-translate-x-full'); document.body.style.overflow = ''; };

    // Show auth modal (login/register) before checkout
    const requireAuth = (callback) => {
      if (state.token && state.account) { callback(); return; }
      showCheckoutAuth(callback);
    };

    const showCheckoutAuth = (onSuccess) => {
      const modal = document.getElementById('paymentModal');
      if (!modal) return;
      document.getElementById('paymentModalIcon').innerHTML = '<div class="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center"><svg class="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg></div>';
      document.getElementById('paymentModalTitle').textContent = 'Sign in to Checkout';
      document.getElementById('paymentModalDesc').textContent = 'Create an account or sign in to track your order.';
      document.getElementById('paymentModalDetails').innerHTML = `
        <div id="checkoutAuthTabs" class="space-y-3 text-left">
          <div id="coLogin" class="space-y-2">
            <input id="coLoginEmail" type="email" placeholder="Email address" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary" required>
            <input id="coLoginPass" type="password" placeholder="Password" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary" required>
            <p id="coLoginErr" class="hidden text-xs text-red-500 text-center"></p>
          </div>
          <div id="coRegister" class="hidden space-y-2">
            <input id="coRegName" placeholder="Full name" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary" required>
            <input id="coRegPhone" placeholder="Phone number" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary" required>
            <input id="coRegEmail" type="email" placeholder="Email address" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary" required>
            <input id="coRegPass" type="password" placeholder="Password (min 6 chars)" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary" required>
            <p id="coRegErr" class="hidden text-xs text-red-500 text-center"></p>
          </div>
        </div>`;
      document.getElementById('paymentModalActions').innerHTML = `
        <button id="coSubmitBtn" onclick="App.Cart._checkoutAuthLogin()" class="w-full bg-primary text-white font-bold text-sm py-3 rounded-full hover:bg-primary-dark transition haptic mb-2">Sign In & Pay</button>
        <p id="coToggleText" class="text-center text-sm text-paragraph">Don't have an account? <button onclick="App.Cart._checkoutAuthToggle()" class="text-primary font-semibold">Register</button></p>
        <button onclick="App.Cart.closePaymentModal()" class="w-full text-gray-400 text-xs font-medium py-2 hover:text-heading transition mt-1">Cancel</button>`;
      modal.classList.remove('hidden');
      modal._onSuccess = onSuccess;
    };

    let _checkoutMode = 'login';
    const _checkoutAuthToggle = () => {
      _checkoutMode = _checkoutMode === 'login' ? 'register' : 'login';
      const loginEl = document.getElementById('coLogin');
      const regEl = document.getElementById('coRegister');
      const btn = document.getElementById('coSubmitBtn');
      const toggle = document.getElementById('coToggleText');
      if (_checkoutMode === 'register') {
        loginEl?.classList.add('hidden'); regEl?.classList.remove('hidden');
        if (btn) { btn.textContent = 'Create Account & Pay'; btn.setAttribute('onclick', 'App.Cart._checkoutAuthRegister()'); }
        if (toggle) toggle.innerHTML = 'Already have an account? <button onclick="App.Cart._checkoutAuthToggle()" class="text-primary font-semibold">Sign In</button>';
      } else {
        loginEl?.classList.remove('hidden'); regEl?.classList.add('hidden');
        if (btn) { btn.textContent = 'Sign In & Pay'; btn.setAttribute('onclick', 'App.Cart._checkoutAuthLogin()'); }
        if (toggle) toggle.innerHTML = 'Don\'t have an account? <button onclick="App.Cart._checkoutAuthToggle()" class="text-primary font-semibold">Register</button>';
      }
    };

    const _checkoutAuthLogin = async () => {
      const email = document.getElementById('coLoginEmail')?.value.trim();
      const password = document.getElementById('coLoginPass')?.value;
      const err = document.getElementById('coLoginErr');
      if (!email || !password) { if (err) { err.textContent = 'Enter email and password'; err.classList.remove('hidden'); } return; }
      try {
        const data = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
        state.token = data.token; state.account = data.user;
        Toast.show('Signed in!', '👋');
        const modal = document.getElementById('paymentModal');
        const cb = modal?._onSuccess; closePaymentModal();
        if (cb) cb();
      } catch (e) { if (err) { err.textContent = e.message; err.classList.remove('hidden'); } }
    };

    const _checkoutAuthRegister = async () => {
      const name = document.getElementById('coRegName')?.value.trim();
      const phone = document.getElementById('coRegPhone')?.value.trim();
      const email = document.getElementById('coRegEmail')?.value.trim();
      const password = document.getElementById('coRegPass')?.value;
      const err = document.getElementById('coRegErr');
      if (!email || !password) { if (err) { err.textContent = 'Email and password required'; err.classList.remove('hidden'); } return; }
      try {
        const data = await apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, phone, email, password }) });
        state.token = data.token; state.account = data.user;
        Toast.show('Account created!', '🎉');
        const modal = document.getElementById('paymentModal');
        const cb = modal?._onSuccess; closePaymentModal();
        if (cb) cb();
      } catch (e) { if (err) { err.textContent = e.message; err.classList.remove('hidden'); } }
    };

    const checkoutWhatsApp = async () => {
      if (state.cart.length === 0) return;
      requireAuth(async () => {
        const subtotal = getTotal();
        const delivery = calculateDelivery(subtotal);
        const total = Math.max(0, subtotal + delivery);
        try {
          await apiFetch('/api/orders', {
            method: 'POST',
            body: JSON.stringify({
              email: state.account?.email || '',
              phone: state.account?.phone || '',
              items: state.cart.map(i => ({ name: i.name, qty: i.qty, price: i.price, productId: i.productId })),
              subtotal, deliveryFee: delivery, discount: 0, total,
              deliveryLocation: 'nairobi',
            }),
          });
        } catch (err) { console.error('Order recording failed:', err); }
        let msg = `Hello U-NiceNutraCare! 🛒\n\n`;
        state.cart.forEach(item => { msg += `• ${item.name} x${item.qty} — ${CURRENCY} ${(item.price * item.qty).toLocaleString()}\n`; });
        msg += `\nSubtotal: ${CURRENCY} ${subtotal.toLocaleString()}`;
        msg += `\nDelivery: ${delivery === 0 ? 'Free' : CURRENCY + ' ' + delivery}`;
        msg += `\nTotal: ${CURRENCY} ${total.toLocaleString()}`;
        window.open(`${WA_LINK}?text=${encodeURIComponent(msg)}`, '_blank');
        state.cart = []; updateUI();
      });
    };

    // Fetch Paystack public key on init
    const initPaystack = async () => {
      try { const d = await apiFetch('/api/config'); paystackKey = d.paystackPublicKey || ''; } catch {}
    };

    const checkoutPaystack = () => {
      if (state.cart.length === 0) return;
      requireAuth(async () => {
        if (!paystackKey) { Toast.show('Payment not configured yet', '❌'); return; }
        const subtotal = getTotal();
        const delivery = calculateDelivery(subtotal);
        const total = Math.max(0, subtotal + delivery);

        let orderId;
        try {
          const orderData = await apiFetch('/api/orders', {
            method: 'POST',
            body: JSON.stringify({
              email: state.account.email,
              phone: state.account.phone || '',
              items: state.cart.map(i => ({ name: i.name, qty: i.qty, price: i.price, productId: i.productId })),
              subtotal, deliveryFee: delivery, discount: 0, total,
              deliveryLocation: state.cart._location || 'nairobi',
            }),
          });
          orderId = orderData.orderId;
        } catch (err) { Toast.show('Failed to create order', '❌'); return; }

        showPaymentPending(orderId, total);

        try {
          const data = await apiFetch('/api/paystack/initialize', {
            method: 'POST',
            body: JSON.stringify({ email: state.account.email, amount: total, orderId }),
          });

          if (data.success && data.access_code) {
            const popup = PaystackPop.setup({
              key: paystackKey,
              email: state.account.email,
              amount: total * 100,
              currency: 'KES',
              ref: data.reference,
              onClose: () => { showPaymentFailed(orderId, 'Payment cancelled.'); },
              onSuccess: (transaction) => {
                verifyPayment(orderId, transaction.reference, total);
              },
            });
            popup.openIframe();
          } else {
            showPaymentFailed(orderId, data.error || 'Failed to initialize payment');
          }
        } catch (err) {
          showPaymentFailed(orderId, 'Network error. Please try again.');
        }
      });
    };

    const verifyPayment = async (orderId, reference, total) => {
      showPaymentPending(orderId, total);
      try {
        const data = await apiFetch(`/api/paystack/verify/${reference}`);
        if (data.success && data.status === 'paid') {
          showPaymentSuccess(orderId, total, reference);
          state.cart = []; updateUI();
        } else {
          showPaymentFailed(orderId, data.message || 'Payment not confirmed');
        }
      } catch (err) {
        showPaymentFailed(orderId, 'Could not verify payment. Contact support with Order ID.');
      }
    };

    const showPaymentPending = (orderId, total) => {
      const modal = document.getElementById('paymentModal');
      if (!modal) return;
      document.getElementById('paymentModalIcon').innerHTML = '<div class="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center animate-pulse"><div class="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>';
      document.getElementById('paymentModalTitle').textContent = 'Processing Payment...';
      document.getElementById('paymentModalDesc').textContent = 'Complete your payment in the secure Paystack window.';
      document.getElementById('paymentModalDetails').innerHTML = `<div class="bg-gray-50 rounded-xl p-4 space-y-2"><div class="flex justify-between text-sm"><span class="text-paragraph">Order ID:</span><span class="font-bold text-heading">${orderId}</span></div><div class="flex justify-between text-sm"><span class="text-paragraph">Amount:</span><span class="font-bold text-primary">${CURRENCY} ${total.toLocaleString()}</span></div></div>`;
      document.getElementById('paymentModalActions').innerHTML = `<button onclick="App.Cart.cancelPayment()" class="w-full border border-gray-200 text-gray-500 font-semibold text-sm py-2.5 rounded-full hover:bg-gray-50 transition haptic">Cancel</button>`;
      modal.classList.remove('hidden');
    };
    const showPaymentSuccess = (orderId, total, ref) => {
      const modal = document.getElementById('paymentModal');
      if (!modal) return;
      document.getElementById('paymentModalIcon').innerHTML = '<div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center"><svg class="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg></div>';
      document.getElementById('paymentModalTitle').textContent = 'Payment Successful!';
      document.getElementById('paymentModalDesc').textContent = 'Your payment has been confirmed.';
      document.getElementById('paymentModalDetails').innerHTML = `<div class="bg-gray-50 rounded-xl p-4 space-y-2"><div class="flex justify-between text-sm"><span class="text-paragraph">Order ID:</span><span class="font-bold text-heading">${orderId}</span></div><div class="flex justify-between text-sm"><span class="text-paragraph">Reference:</span><span class="font-bold text-green-600">${ref || 'N/A'}</span></div><div class="flex justify-between text-sm"><span class="text-paragraph">Amount Paid:</span><span class="font-bold text-primary">${CURRENCY} ${total.toLocaleString()}</span></div></div><p class="text-xs text-paragraph mt-3 text-center">Track your order in <strong>My Account → Order History</strong></p>`;
      document.getElementById('paymentModalActions').innerHTML = `<button onclick="App.Cart.closePaymentModal()" class="w-full bg-primary text-white font-bold text-sm py-3 rounded-full hover:bg-primary-dark transition haptic">Done</button>`;
    };
    const showPaymentFailed = (orderId, reason) => {
      const modal = document.getElementById('paymentModal');
      if (!modal) return;
      document.getElementById('paymentModalIcon').innerHTML = '<div class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center"><svg class="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></div>';
      document.getElementById('paymentModalTitle').textContent = 'Payment Failed';
      document.getElementById('paymentModalDesc').textContent = reason;
      document.getElementById('paymentModalDetails').innerHTML = `<div class="bg-gray-50 rounded-xl p-4"><div class="flex justify-between text-sm"><span class="text-paragraph">Order ID:</span><span class="font-bold text-heading">${orderId}</span></div></div>`;
      document.getElementById('paymentModalActions').innerHTML = `<button onclick="App.Cart.checkoutPaystack()" class="w-full bg-primary text-white font-bold text-sm py-3 rounded-full hover:bg-primary-dark transition haptic mb-2">Retry Payment</button><button onclick="App.Cart.fallbackWhatsApp()" class="w-full border border-gray-200 text-gray-500 font-semibold text-sm py-2.5 rounded-full hover:bg-gray-50 transition haptic">Pay via WhatsApp</button>`;
      modal.classList.remove('hidden');
    };
    const cancelPayment = () => { closePaymentModal(); };
    const closePaymentModal = () => { const m = document.getElementById('paymentModal'); if (m) m.classList.add('hidden'); };
    const fallbackWhatsApp = () => { closePaymentModal(); checkoutWhatsApp(); };

    return { add, remove, updateQty, clear, getCount, getTotal, updateUI, setDelivery: (loc) => { state.cart._location = loc; updateUI(); }, open, close, checkoutWhatsApp, checkoutPaystack, cancelPayment, closePaymentModal, fallbackWhatsApp, initPaystack, _checkoutAuthToggle, _checkoutAuthLogin, _checkoutAuthRegister };
  })();

  // ===== MODULE: Wishlist =====
  const Wishlist = (() => {
    const toggle = (id) => {
      if (state.wishlist.includes(id)) { state.wishlist = state.wishlist.filter(x => x !== id); Toast.show(I18n.t('toast_wishlist_removed'), '💔'); }
      else { state.wishlist = [...state.wishlist, id]; Toast.show(I18n.t('toast_wishlist_added'), '❤️'); }
      const badge = document.getElementById('wishlistCount');
      if (badge) { badge.textContent = state.wishlist.length; badge.classList.toggle('hidden', state.wishlist.length === 0); }
    };
    const render = () => {
      const body = document.getElementById('wishlistBody');
      const badge = document.getElementById('wishlistCount');
      if (badge) { badge.textContent = state.wishlist.length; badge.classList.toggle('hidden', state.wishlist.length === 0); }
      if (!body) return;
      if (state.wishlist.length === 0) {
        body.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-center py-12"><div class="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4"><svg class="w-10 h-10 text-red-300" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></div><p class="text-gray-500 font-medium mb-1">${I18n.t('wishlist_empty')}</p><p class="text-gray-400 text-sm mb-4">${I18n.t('wishlist_empty_sub')}</p><button onclick="App.Wishlist.close()" class="bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-primary-dark transition haptic">${I18n.t('wishlist_browse')}</button></div>`;
        return;
      }
      body.innerHTML = state.wishlist.map(id => {
        const p = state.products.find(x => x.id === id);
        if (!p) return '';
        const name = Products.getName(p);
        return `<div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"><div class="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-2xl shrink-0 border border-gray-100">${Products.getEmoji(name)}</div><div class="flex-1 min-w-0"><p class="text-sm font-semibold text-heading line-clamp-1">${name}</p><p class="text-xs text-paragraph">${CURRENCY} ${p.price}</p><div class="flex gap-2 mt-1"><button onclick="App.Cart.add('${name}',${p.price},${p.id})" class="bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full haptic">Add to Cart</button><button onclick="App.Wishlist.toggle(${p.id})" class="text-red-400 text-[10px] font-medium hover:text-red-600 transition">Remove</button></div></div></div>`;
      }).join('');
    };
    const open = () => { render(); document.getElementById('wishlistPanel').classList.remove('-translate-x-full'); document.body.style.overflow = 'hidden'; };
    const close = () => { document.getElementById('wishlistPanel').classList.add('-translate-x-full'); document.body.style.overflow = ''; };
    return { toggle, render, open, close };
  })();

  // ===== MODULE: Reviews (API-backed) =====
  const Reviews = (() => {
    let currentRating = 0;
    const setStar = (n) => {
      currentRating = n;
      document.querySelectorAll('.review-star').forEach(s => { s.textContent = parseInt(s.dataset.star) <= n ? '★' : '☆'; s.classList.toggle('text-secondary', parseInt(s.dataset.star) <= n); s.classList.toggle('text-gray-300', parseInt(s.dataset.star) > n); });
    };
    const submit = async (e, productId) => {
      e.preventDefault();
      const name = document.getElementById('reviewName').value.trim();
      const comment = document.getElementById('reviewComment').value.trim();
      if (!name || !currentRating) return;
      try {
        await apiFetch('/api/reviews', {
          method: 'POST',
          body: JSON.stringify({ productId, userName: name, rating: currentRating, comment }),
        });
        Toast.show('Review submitted!', '⭐');
        Products.openDetail(productId);
      } catch (err) {
        Toast.show('Failed to submit review', '❌');
      }
    };
    return { setStar, submit };
  })();

  // ===== MODULE: Search =====
  const Search = (() => {
    let debounceTimer;
    const showAutocomplete = (query) => {
      const dropdown = document.getElementById('searchAutocomplete');
      if (!dropdown) return;
      if (!query || query.length < 2) { dropdown.classList.add('hidden'); return; }
      const q = query.toLowerCase();
      const matches = state.products.filter(p => {
        const name = (Products.getName(p)).toLowerCase();
        const desc = (p.desc_en || '').toLowerCase();
        const cat = p.category.toLowerCase();
        return name.includes(q) || desc.includes(q) || cat.includes(q);
      }).slice(0, 5);
      let html = '';
      if (matches.length) {
        html = matches.map(p => `<div class="px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer flex items-center gap-3" onclick="App.Products.openDetail(${p.id});document.getElementById('searchAutocomplete').classList.add('hidden')"><img loading="lazy" src="${p.image_url}" class="w-8 h-8 rounded object-cover" alt=""><div><p class="font-medium text-heading">${Products.getName(p)}</p><p class="text-xs text-gray-400">${CURRENCY} ${p.price}</p></div></div>`).join('');
      }
      if (!html) { dropdown.classList.add('hidden'); return; }
      dropdown.innerHTML = html;
      dropdown.classList.remove('hidden');
    };
    const init = () => {
      const input = document.getElementById('searchInput');
      const clearBtn = document.getElementById('searchClear');
      const dropdown = document.getElementById('searchAutocomplete');
      if (!input) return;
      input.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        clearBtn.classList.toggle('hidden', !e.target.value);
        showAutocomplete(e.target.value.trim());
        debounceTimer = setTimeout(() => { state.search = e.target.value.trim(); state.productsLoaded = false; Products.renderGrid(); }, 300);
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && input.value.trim()) { if (dropdown) dropdown.classList.add('hidden'); }
      });
      document.addEventListener('click', (e) => { if (dropdown && !e.target.closest('#searchInput') && !e.target.closest('#searchAutocomplete')) dropdown.classList.add('hidden'); });
      if (clearBtn) clearBtn.addEventListener('click', () => { input.value = ''; state.search = ''; state.productsLoaded = false; clearBtn.classList.add('hidden'); if (dropdown) dropdown.classList.add('hidden'); Products.renderGrid(); });
    };
    const clear = () => { const input = document.getElementById('searchInput'); if (input) input.value = ''; state.search = ''; state.productsLoaded = false; document.getElementById('searchClear')?.classList.add('hidden'); document.getElementById('searchAutocomplete')?.classList.add('hidden'); Products.renderGrid(); };
    return { init, clear };
  })();

  // ===== MODULE: Account (JWT-backed) =====
  const Account = (() => {
    const updateNavLabel = () => {
      const label = document.getElementById('accountNavLabel');
      if (label) label.textContent = state.account ? (state.account.name || 'Account') : 'Sign In';
    };

    const isLoggedIn = () => !!state.token && !!state.account;

    const renderAuth = () => {
      const panel = document.getElementById('accountBody');
      if (!panel) return;
      if (isLoggedIn()) {
        const a = state.account || {};
        panel.innerHTML = `<div class="p-5 space-y-4">
          <div class="flex items-center gap-3 mb-4"><div class="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xl">${(a.name || 'U')[0].toUpperCase()}</div><div><p class="font-semibold text-heading">${a.name || 'User'}</p><p class="text-xs text-paragraph">${a.email || ''}</p></div></div>
          <h3 class="font-semibold text-heading text-sm">${I18n.t('account_profile')}</h3>
          <input id="accountName" value="${a.name || ''}" placeholder="${I18n.t('account_name')}" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary">
          <input id="accountPhone" value="${a.phone || ''}" placeholder="${I18n.t('account_phone')}" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary">
          <input id="accountEmail" type="email" value="${a.email || ''}" placeholder="${I18n.t('account_email')}" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary" disabled>
          <input id="accountAddress" value="${a.address || ''}" placeholder="${I18n.t('account_address')}" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary">
          <button onclick="App.Account.save()" class="w-full bg-primary text-white font-bold text-sm py-3 rounded-full hover:bg-primary-dark transition haptic">${I18n.t('account_save')}</button>
          <div id="accountMsg" class="hidden text-xs text-green-600 font-medium"></div>
          <button onclick="App.Account.logout()" class="w-full border border-red-200 text-red-500 font-semibold text-sm py-2.5 rounded-full hover:bg-red-50 transition haptic mt-4">Logout</button>
        </div>`;
      } else {
        panel.innerHTML = `<div class="p-5 space-y-4">
          <div id="authLogin" class="space-y-3">
            <h2 class="font-display font-bold text-heading text-xl mb-1">${I18n.t('account_title')}</h2>
            <p class="text-paragraph text-sm mb-4">Sign in to track orders and save your profile.</p>
            <input id="loginEmail" type="email" placeholder="${I18n.t('account_email')}" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary" required>
            <input id="loginPassword" type="password" placeholder="Password" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary" required>
            <button onclick="App.Account.login()" class="w-full bg-primary text-white font-bold text-sm py-3 rounded-full hover:bg-primary-dark transition haptic">Login</button>
            <p class="text-center text-sm text-paragraph">Don't have an account? <button onclick="App.Account.showRegister()" class="text-primary font-semibold">Register</button></p>
            <div id="authError" class="hidden text-xs text-red-500 font-medium text-center"></div>
          </div>
          <div id="authRegister" class="hidden space-y-3">
            <h2 class="font-display font-bold text-heading text-xl mb-1">Create Account</h2>
            <input id="regName" placeholder="${I18n.t('account_name')}" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary" required>
            <input id="regPhone" placeholder="${I18n.t('account_phone')}" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary" required>
            <input id="regEmail" type="email" placeholder="${I18n.t('account_email')}" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary" required>
            <input id="regPassword" type="password" placeholder="Password (min 6 chars)" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary" required>
            <button onclick="App.Account.register()" class="w-full bg-primary text-white font-bold text-sm py-3 rounded-full hover:bg-primary-dark transition haptic">Create Account</button>
            <p class="text-center text-sm text-paragraph">Already have an account? <button onclick="App.Account.showLogin()" class="text-primary font-semibold">Login</button></p>
            <div id="regError" class="hidden text-xs text-red-500 font-medium text-center"></div>
          </div>
        </div>`;
      }
    };

    const showRegister = () => { document.getElementById('authLogin')?.classList.add('hidden'); document.getElementById('authRegister')?.classList.remove('hidden'); };
    const showLogin = () => { document.getElementById('authRegister')?.classList.add('hidden'); document.getElementById('authLogin')?.classList.remove('hidden'); };

    const register = async () => {
      const name = document.getElementById('regName')?.value.trim();
      const phone = document.getElementById('regPhone')?.value.trim();
      const email = document.getElementById('regEmail')?.value.trim();
      const password = document.getElementById('regPassword')?.value;
      const err = document.getElementById('regError');
      if (!email || !password) { if (err) { err.textContent = 'Email and password are required'; err.classList.remove('hidden'); } return; }
      try {
        const data = await apiFetch('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, phone, email, password }),
        });
        state.token = data.token;
        state.account = data.user;
        Toast.show('Account created! Welcome ' + name, '🎉');
        updateNavLabel();
        renderAuth();
      } catch (err2) {
        if (err) { err.textContent = err2.message; err.classList.remove('hidden'); }
      }
    };

    const login = async () => {
      const email = document.getElementById('loginEmail')?.value.trim();
      const password = document.getElementById('loginPassword')?.value;
      const err = document.getElementById('authError');
      try {
        const data = await apiFetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        state.token = data.token;
        state.account = data.user;
        Toast.show('Welcome back, ' + (data.user.name || email) + '!', '👋');
        updateNavLabel();
        renderAuth();
      } catch (err2) {
        if (err) { err.textContent = err2.message; err.classList.remove('hidden'); }
      }
    };

    const logout = () => { state.token = null; state.account = null; Toast.show('Logged out'); updateNavLabel(); renderAuth(); };

    const save = async () => {
      const name = document.getElementById('accountName')?.value.trim();
      const phone = document.getElementById('accountPhone')?.value.trim();
      const address = document.getElementById('accountAddress')?.value.trim();
      try {
        await apiFetch('/api/auth/profile', {
          method: 'PUT',
          body: JSON.stringify({ name, phone, address }),
        });
        state.account = { ...state.account, name, phone, address };
        Toast.show(I18n.t('toast_profile_saved'));
      } catch (err) {
        Toast.show('Failed to save profile', '❌');
      }
    };

    const open = () => { renderAuth(); document.getElementById('accountPanel').classList.remove('-translate-x-full'); document.body.style.overflow = 'hidden'; };
    const close = () => { document.getElementById('accountPanel').classList.add('-translate-x-full'); document.body.style.overflow = ''; };

    return { open, close, save, logout, login, register, showRegister, showLogin, isLoggedIn, renderAuth, updateNavLabel };
  })();

  // ===== MODULE: Share =====
  const Share = (() => {
    const product = (id) => {
      const p = state.products.find(x => x.id === id);
      if (!p) return;
      const text = `${Products.getName(p)} — ${CURRENCY} ${p.price}\n${WA_LINK}`;
      if (navigator.share) navigator.share({ title: Products.getName(p), text }).catch(() => {});
      else { navigator.clipboard?.writeText(text); Toast.show(I18n.t('toast_share_copied')); }
    };
    return { product };
  })();

  // ===== MODULE: Blog (static) =====
  const Blog = (() => {
    const blogArticles = [
      { title:{en:"The Complete Guide to Moringa",sw:"Mwongozo Kamili wa Moringa",fr:"Guide Complet du Moringa"}, category:{en:"Superfoods",sw:"Chakula Bora",fr:"Super-aliments"}, excerpt:{en:"Discover why moringa is called the 'miracle tree'.",sw:"Gundua kwa nini moringa inaitwa 'mti wa ajabu'.",fr:"Découvrez pourquoi le moringa est appelé l'arbre miracle."}, readTime:5, image:"https://images.unsplash.com/photo-1506617420156-8e4536971650?w=600&h=400&fit=crop", body:{en:"Moringa oleifera, commonly known as the 'miracle tree,' is one of the most nutrient-dense plants on Earth.",sw:"Moringa oleifera, inayojulikana kama 'mti wa ajabu', ni moja ya mimea yenye virutubisho zaidi duniani.",fr:"Moringa oleifera, communément appelé l'arbre miracle, est l'une des plantes les plus riches en nutriments."} },
      { title:{en:"Turmeric Golden Milk Recipe",sw:"Resipe ya Maziwa ya Dhahabu ya Manjano",fr:"Recette du Lait d'Or au Curcuma"}, category:{en:"Recipes",sw:"Mapishi",fr:"Recettes"}, excerpt:{en:"Learn how to make anti-inflammatory golden milk.",sw:"Jifunze jinsi ya kutengeneza maziwa ya dhahabu.",fr:"Apprenez à préparer le lait d'or anti-inflammatoire."}, readTime:3, image:"https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=600&h=400&fit=crop", body:{en:"Golden milk is a warm, comforting beverage with powerful anti-inflammatory properties.",sw:"Maziwa ya dhahabu ni kinywaji chenye nguvu za kuzuia uvimbe.",fr:"Le lait d'or est une boisson réconfortante aux propriétés anti-inflammatoires puissantes."} },
      { title:{en:"Starting Your First Herb Garden",sw:"Kuan Bustani Yako ya Kwanza ya Mimea",fr:"Créer Votre Premier Jardin d'Herbes"}, category:{en:"Gardening",sw:"Ulimaji",fr:"Jardinage"}, excerpt:{en:"A beginner's guide to growing medicinal herbs.",sw:"Mwongozo wa kuanza kwa mimea ya tiba.",fr:"Guide du débutant pour cultiver des herbes médicinales."}, readTime:7, image:"https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&h=400&fit=crop", body:{en:"Nairobi's moderate climate makes it ideal for growing a wide variety of medicinal herbs.",sw:"Hali ya hewa ya Nairobi inafaa kwa kukuza mimea mingi ya tiba.",fr:"Le climat modéré de Nairobi le rend idéal pour cultiver des herbes médicinales."} },
    ];
    const getName = (obj) => obj[state.lang] || obj.en;
    const render = () => {
      const grid = document.getElementById('blogGrid');
      if (!grid) return;
      grid.innerHTML = blogArticles.map((a, i) => `<div class="bg-white rounded-2xl shadow-card border border-gray-50 overflow-hidden group cursor-pointer haptic" onclick="App.Blog.openModal(${i})"><div class="relative h-40 overflow-hidden"><div class="skeleton absolute inset-0"></div><img loading="lazy" src="${a.image}" alt="${getName(a.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-0 transition-opacity" onload="this.classList.remove('opacity-0');this.previousElementSibling.classList.add('hidden')"></div><div class="p-4"><span class="text-[10px] font-bold text-primary uppercase">${getName(a.category)}</span><h3 class="font-display font-bold text-heading text-sm mt-1 line-clamp-1">${getName(a.title)}</h3><p class="text-paragraph text-xs mt-1 line-clamp-2">${getName(a.excerpt)}</p><div class="flex items-center justify-between mt-3"><span class="text-paragraph text-[10px]">${a.readTime} ${I18n.t('blog_read_time')}</span><span class="text-primary text-xs font-semibold group-hover:underline">${I18n.t('blog_read_more')}</span></div></div></div>`).join('');
    };
    const openModal = (i) => {
      const a = blogArticles[i];
      document.getElementById('blogModalBody').innerHTML = `<img loading="lazy" src="${a.image}" alt="${getName(a.title)}" class="w-full h-48 object-cover rounded-xl mb-4"><span class="text-[10px] font-bold text-primary uppercase">${getName(a.category)}</span><h2 class="font-display font-bold text-heading text-xl mt-1 mb-2">${getName(a.title)}</h2><p class="text-paragraph text-xs mb-4">${a.readTime} ${I18n.t('blog_read_time')}</p><div class="text-paragraph text-sm leading-relaxed">${getName(a.body).split('\n\n').map(p => `<p class="mb-3">${p}</p>`).join('')}</div>`;
      document.getElementById('blogModal').classList.remove('-translate-x-full');
      document.body.style.overflow = 'hidden';
    };
    const closeModal = () => { document.getElementById('blogModal').classList.add('-translate-x-full'); document.body.style.overflow = ''; };
    return { render, openModal, closeModal };
  })();

  // ===== MODULE: Newsletter (API-backed) =====
  const Newsletter = (() => {
    const init = () => {
      const form = document.getElementById('newsletterForm');
      if (!form) return;
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = form.querySelector('input[type="email"]');
        const email = input.value.trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
        try {
          await apiFetch('/api/subscribe', { method: 'POST', body: JSON.stringify({ email }) });
          input.value = '';
          Toast.show('Subscribed! ✓', '📧');
          const msg = document.getElementById('newsletterMsg');
          if (msg) { msg.classList.remove('hidden'); setTimeout(() => msg.classList.add('hidden'), 3000); }
        } catch (err) {
          Toast.show('Already subscribed or error occurred', '📧');
        }
      });
    };
    return { init };
  })();

  // ===== MODULE: PWA =====
  const PWA = (() => {
    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; });
    const install = () => { if (!deferredPrompt) return; deferredPrompt.prompt(); deferredPrompt.userChoice.then(() => { deferredPrompt = null; }); document.getElementById('pwaBanner')?.classList.add('hidden'); };
    const dismiss = () => { document.getElementById('pwaBanner')?.classList.add('hidden'); localStorage.setItem('unicePWADismissed', '1'); };
    const requestNotif = () => { if ('Notification' in window && Notification.permission === 'default') { Notification.requestPermission(); } document.getElementById('notifBanner')?.classList.add('hidden'); };
    const dismissNotif = () => { document.getElementById('notifBanner')?.classList.add('hidden'); localStorage.setItem('uniceNotifDismissed', '1'); };
    const init = () => {
      setTimeout(() => document.getElementById('cookieBanner')?.classList.remove('hidden'), 2000);
      if (!localStorage.getItem('unicePWADismissed')) setTimeout(() => document.getElementById('pwaBanner')?.classList.remove('hidden'), 5000);
    };
    return { install, dismiss, requestNotif, dismissNotif, init };
  })();

  // ===== MODULE: UI =====
  const UI = (() => {
    const openSidebar = () => { document.getElementById('mobileSidebar')?.classList.remove('-translate-x-full'); };
    const closeSidebar = () => { document.getElementById('mobileSidebar')?.classList.add('-translate-x-full'); };
    const submitContact = (e) => {
      e.preventDefault();
      const f = e.target;
      const [name, phone, interest, message] = [f.querySelector('input[type="text"]')?.value, f.querySelector('input[type="tel"]')?.value, f.querySelector('select')?.value, f.querySelector('textarea')?.value];
      if (!name || !phone || !interest || !message) return;
      window.open(`${WA_LINK}?text=${encodeURIComponent(`Hello U-NiceNutraCare!\n\nName: ${name}\nPhone: ${phone}\nInterested in: ${interest}\n\nMessage: ${message}`)}`, '_blank');
      f.reset();
    };
    return { openSidebar, closeSidebar, submitContact };
  })();

  // ===== FLASH SALE COUNTDOWN =====
  const FlashSale = (() => {
    const DURATION = 8 * 3600 + 45 * 60 + 20;
    let endTime;
    let rafId;
    let lastTime = 0;
    const getRemaining = () => Math.max(0, Math.floor((endTime - Date.now()) / 1000));
    const tick = (time) => {
      if (time - lastTime >= 1000) {
        lastTime = time;
        const remaining = getRemaining();
        if (remaining <= 0) { document.getElementById('flashCountdown').innerHTML = '<span class="text-sm font-bold">Sale Ended</span>'; return; }
        const h = Math.floor(remaining / 3600), m = Math.floor((remaining % 3600) / 60), s = remaining % 60;
        document.getElementById('flashHours').textContent = String(h).padStart(2, '0');
        document.getElementById('flashMins').textContent = String(m).padStart(2, '0');
        document.getElementById('flashSecs').textContent = String(s).padStart(2, '0');
      }
      rafId = requestAnimationFrame(tick);
    };
    const start = () => {
      const stored = localStorage.getItem('uniceFlashEnd');
      if (stored && parseInt(stored) > Date.now()) { endTime = parseInt(stored); }
      else { endTime = Date.now() + DURATION * 1000; localStorage.setItem('uniceFlashEnd', endTime); }
      rafId = requestAnimationFrame(tick);
    };
    return { start };
  })();

  // ===== SCROLL EFFECTS =====
  const ScrollEffects = (() => {
    const toggleBackToTop = () => { document.getElementById('backToTop')?.classList.toggle('visible', window.scrollY > 500); };
    const updateActiveNav = () => {
      const sections = document.querySelectorAll('section[id]');
      const links = document.querySelectorAll('.mobile-bottom-nav a');
      sections.forEach(section => {
        const top = section.offsetTop - 100;
        const h = section.offsetHeight;
        const id = section.getAttribute('id');
        if (window.scrollY >= top && window.scrollY < top + h) {
          links.forEach(link => { link.classList.remove('text-primary'); link.classList.add('text-gray-400'); if (link.getAttribute('href') === '#' + id) { link.classList.remove('text-gray-400'); link.classList.add('text-primary'); } });
        }
      });
    };
    return { toggleBackToTop, updateActiveNav };
  })();

  // ===== ANALYTICS =====
  const Analytics = (() => {
    const track = (eventType, eventData = {}) => {
      apiFetch('/api/track', {
        method: 'POST',
        body: JSON.stringify({ eventType, eventData, sessionId: sessionStorage.getItem('sessionId') || (() => { const id = crypto.randomUUID(); sessionStorage.setItem('sessionId', id); return id; })() }),
      }).catch(() => {});
    };
    return { track };
  })();

  // ===== INIT =====
  const init = async () => {
    try {
      I18n.updateText();
      await Products.renderCarousels();
      await Products.renderGrid();
    } catch (e) {
      console.error('Init error:', e);
    }
    Wishlist.render();
    Blog.render();
    Cart.updateUI();
    Cart.initPaystack();
    Account.updateNavLabel();
    Search.init();
    FlashSale.start();
    PWA.init();
    Newsletter.init();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
      navigator.serviceWorker.addEventListener('message', e => {
        if (e.data && e.data.type === 'SW_UPDATED') location.reload();
      });
    }
    window.addEventListener('scroll', () => { ScrollEffects.toggleBackToTop(); ScrollEffects.updateActiveNav(); }, { passive: true });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { UI.closeSidebar(); Cart.close(); Products.closeDetail(); Wishlist.close(); Account.close(); Blog.closeModal(); } });
    document.querySelectorAll('a[href^="#"]').forEach(a => { a.addEventListener('click', (e) => { e.preventDefault(); const t = document.querySelector(a.getAttribute('href')); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }); });
    if (typeof Swiper !== 'undefined') {
      try {
        new Swiper('.bannerSwiper', { loop: true, autoplay: { delay: 5000, disableOnInteraction: false }, pagination: { el: '.banner-pagination', clickable: true }, navigation: { nextEl: '.banner-next', prevEl: '.banner-prev' } });
        const sc = { slidesPerView: 2.2, spaceBetween: 12, freeMode: true, breakpoints: { 640: { slidesPerView: 3.2, spaceBetween: 16 }, 1024: { slidesPerView: 4.2, spaceBetween: 20 } } };
        new Swiper('.seedlingSwiper', { ...sc, navigation: { nextEl: '.seedling-next', prevEl: '.seedling-prev' } });
        new Swiper('.herbSwiper', { ...sc, navigation: { nextEl: '.herb-next', prevEl: '.herb-prev' } });
        new Swiper('.spiceSwiper', { ...sc, navigation: { nextEl: '.spice-next', prevEl: '.spice-prev' } });
        new Swiper('.probioticSwiper', { ...sc, navigation: { nextEl: '.probiotic-next', prevEl: '.probiotic-prev' } });
        new Swiper('.flashSwiper', { ...sc });
      } catch (e) { console.warn('Swiper init error:', e); }
    }
    Analytics.track('page_view', { page: 'home' });
  };

  document.addEventListener('DOMContentLoaded', init);

  return { I18n, Products, Cart, Wishlist, Reviews, Search, Blog, PWA, Account, Share, Toast, UI, FlashSale, ScrollEffects, Analytics };
})();

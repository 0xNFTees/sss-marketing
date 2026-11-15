// La Cité – inner page generator (runs in the logged-in WordPress tab).
// Reads each live page, rebuilds its content in the new full-width design, saves it as a draft copy.
(function(){
const BASECSS = "\n.fusion-page-title-bar{display:none!important}#main{padding-top:0!important;padding-bottom:0!important}\nhtml body .fusion-header-wrapper .fusion-header{background-color:rgba(255,255,255,.96)!important}\n/* top bar: Invisalign Gold line + solid booking button */\n.fusion-secondary-header .fusion-row{justify-content:space-between!important;gap:16px}\n.fusion-secondary-header .fusion-row::before{content:\"Fournisseur Invisalign\u00ae OR au centre-ville de Montr\u00e9al\";color:#fff;font:600 12.5px/1.3 Poppins,system-ui,sans-serif;letter-spacing:.09em;text-transform:uppercase}\nhtml[lang^=\"en\"] .fusion-secondary-header .fusion-row::before{content:\"Invisalign\u00ae Gold Provider in downtown Montr\u00e9al\"}\n.fusion-secondary-header .fusion-contact-info a[href*=\"rendez-vous\"],.fusion-secondary-header .fusion-contact-info a[href*=\"appointment\"]{display:inline-block;background:#22c2ee!important;padding:8px 18px!important;line-height:1.2!important;border-radius:999px;margin-right:18px;transition:transform .15s,background .15s}\n.fusion-secondary-header .fusion-contact-info a[href*=\"rendez-vous\"] *,.fusion-secondary-header .fusion-contact-info a[href*=\"appointment\"] *,.fusion-secondary-header .fusion-contact-info a[href*=\"rendez-vous\"],.fusion-secondary-header .fusion-contact-info a[href*=\"appointment\"]{color:#04304f!important;font-weight:600!important;line-height:1.2!important;font-size:13.5px!important}\n.fusion-secondary-header .fusion-contact-info a[href*=\"rendez-vous\"]:hover,.fusion-secondary-header .fusion-contact-info a[href*=\"appointment\"]:hover{background:#fff!important;transform:translateY(-1px)}\n@media(max-width:900px){.fusion-secondary-header .fusion-row::before{display:none}}\n\n.lx{--navy:#074672;--navy2:#04304f;--cyan:#22c2ee;--cyand:#0b93bd;--ink:#0b2a42;--mut:#52697b;--wash:#f2f9fc;--line:#d9eaf3;font-family:Poppins,system-ui,-apple-system,sans-serif;color:var(--ink);line-height:1.6;font-size:17px;-webkit-font-smoothing:antialiased}\n.lx *,.lxf *{box-sizing:border-box}\nhtml{scroll-behavior:smooth}.lxf{scroll-margin-top:120px}\n.lx .w{max-width:1256px;margin:0 auto;padding:0 28px}\n.lx h1,.lx h2,.lx h3{font-family:inherit!important;margin:0!important;color:var(--navy)!important;letter-spacing:-.025em!important;font-weight:500!important}\n.lx h1{font-size:clamp(34px,4vw,54px)!important;line-height:1.06!important;color:#fff!important}\n.lx h2{font-size:clamp(28px,3.1vw,42px)!important;line-height:1.14!important}\n.lx h3{font-size:22px!important;line-height:1.25!important;letter-spacing:-.015em!important}\n.lx p{margin:0;font-size:17px;line-height:1.6;color:var(--mut)}\n.lx a,.lx a:hover,.lxf a{text-decoration:none!important}\n.lx .eb{display:block;font-size:12.5px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--cyand);margin-bottom:14px}\n.lx .sec{padding:104px 0}.lx .wash{background:var(--wash)}\n.lx .lead{font-size:19px;max-width:620px;margin-top:16px}\n\n/* buttons: one pair */\n.lx .b{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:52px;padding:0 26px;border-radius:999px;font-weight:600;font-size:16px;line-height:1;transition:transform .15s,background .15s,color .15s,box-shadow .15s;cursor:pointer}\n.lx .b svg{width:18px;height:18px;flex:none;transition:transform .15s}\n.lx .b:hover{transform:translateY(-2px)}.lx .b:active{transform:translateY(0) scale(.98)}\n.lx .b:hover svg.ar{transform:translateX(3px)}\n.lx .b1{background:var(--cyan);color:var(--navy2)!important;box-shadow:0 10px 24px rgba(34,194,238,.28)}.lx .b1:hover{background:#4fd0f3}\n.lx .b2{background:#fff;color:var(--navy)!important;border:1.5px solid var(--line)}.lx .b2:hover{border-color:var(--navy)}\n.lx .b2.on-dark{background:transparent;color:#fff!important;border-color:rgba(255,255,255,.55)}.lx .b2.on-dark:hover{background:#fff;color:var(--navy2)!important;border-color:#fff}\n.lx .t{display:inline-flex;align-items:center;gap:8px;font-weight:600;color:var(--navy)!important;font-size:16px;background-image:linear-gradient(var(--cyan),var(--cyan));background-size:0 2px;background-repeat:no-repeat;background-position:0 100%;padding-bottom:4px;transition:background-size .25s}\n.lx a:hover>.t,.lx a.t:hover{background-size:100% 2px}\n.lx a:focus-visible,.lxf a:focus-visible{outline:3px solid var(--cyan);outline-offset:3px;border-radius:6px}\n\n/* hero */\n.lx .hero{position:relative;background:var(--navy2);overflow:hidden}\n.lx .hero>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:30% 50%}\n.lx .hero::after{content:\"\";position:absolute;inset:0;background:linear-gradient(90deg,rgba(4,48,79,.95) 0%,rgba(4,48,79,.86) 42%,rgba(4,48,79,.5) 100%)}\n.lx .hero .w{position:relative;z-index:1;min-height:880px;padding-top:196px;padding-bottom:64px;display:flex;flex-direction:column;justify-content:center}\n.lx .hero .txt{max-width:610px}\n.lx .pill{display:inline-flex;align-items:center;gap:10px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.28);color:#fff!important;border-radius:999px;padding:8px 16px 8px 10px;font-size:13.5px;font-weight:600;letter-spacing:.02em;margin-bottom:26px;transition:background .15s,transform .15s}\n.lx .pill:hover{background:rgba(255,255,255,.2);transform:translateY(-1px)}\n.lx .pill i{display:inline-flex;align-items:center;justify-content:center;font-style:normal;background:linear-gradient(135deg,#f6dc8a,#c9993a);color:#3b2a05;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.1em;padding:4px 10px;text-transform:uppercase}\n.lx .hero .s{color:#d7e8f2;font-size:19px;line-height:1.55;margin-top:20px;max-width:560px}\n.lx .ck{list-style:none;margin:28px 0 0;padding:0;display:grid;gap:11px}\n.lx .ck li{display:flex;gap:12px;align-items:flex-start;color:#fff;font-size:16.5px;line-height:1.4;margin:0}\n.lx .ck svg{width:22px;height:22px;flex:none;margin-top:1px}\n.lx .ck a{color:#fff!important;border-bottom:1.5px solid rgba(255,255,255,.5);transition:border-color .15s}.lx .ck a:hover{border-color:var(--cyan)}\n.lx .hero .cta{display:flex;flex-wrap:wrap;gap:14px;align-items:center;margin-top:34px}\n.lx .rate{display:inline-flex;align-items:center;gap:10px;color:#fff!important;font-size:15px;font-weight:500;margin-top:26px}\n.lx .rate b{font-weight:600}.lx .rate .st{color:#f7c948;letter-spacing:2px;font-size:17px}\n.lx .rate .u{border-bottom:1.5px solid transparent;transition:border-color .15s}.lx .rate:hover .u{border-color:#fff}\n.lx .b.mob{display:none}\n@media(prefers-reduced-motion:no-preference){.lx .hero .txt>*{animation:lxin .6s cubic-bezier(.2,.7,.2,1) both}.lx .hero .txt>*:nth-child(2){animation-delay:.06s}.lx .hero .txt>*:nth-child(3){animation-delay:.12s}.lx .hero .txt>*:nth-child(4){animation-delay:.18s}.lx .hero .txt>*:nth-child(5){animation-delay:.24s}.lx .hero .txt>*:nth-child(6){animation-delay:.3s}.lxf{animation:lxin .7s .2s cubic-bezier(.2,.7,.2,1) both}}\n@keyframes lxin{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}\n\n/* booking form card (the clinic's existing Contact Form 7 form) */\n.lxf-wrap{margin:0!important}\n.lxf{font-family:Poppins,system-ui,sans-serif;background:#fff;border-radius:22px;padding:26px 28px 22px;box-shadow:0 30px 70px rgba(4,48,79,.28);color:#0b2a42}\n.lxf h2{font-family:inherit!important;font-size:25px!important;line-height:1.2!important;font-weight:600!important;letter-spacing:-.02em!important;color:#074672!important;margin:0 0 6px!important}\n.lxf .sub{font-size:14px;line-height:1.45;color:#52697b;margin:0 0 14px}\n.lxf form p{margin:0 0 6px!important;font-size:13px!important;font-weight:600;color:#074672!important;line-height:1.4!important}\n.lxf br{display:none}\n.lxf form{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);column-gap:12px}\n.lxf form>*{grid-column:1/-1;order:30;min-width:0}\n.lxf form>p:nth-of-type(9){order:1}.lxf form>p:nth-of-type(10){order:2}\n.lxf form>p:nth-of-type(11){order:3;grid-column:1}.lxf form>p:nth-of-type(13){order:4;grid-column:2}\n.lxf form>p:nth-of-type(12){order:5;grid-column:1}.lxf form>p:nth-of-type(14){order:6;grid-column:2}\n.lxf form>p:nth-of-type(1){order:7}.lxf form>p:nth-of-type(2){order:8}.lxf form>p:nth-of-type(3){order:9}.lxf form>p:nth-of-type(4){order:10}\n.lxf form>p:nth-of-type(5){order:11}.lxf form>p:nth-of-type(6){order:12}.lxf form>p:nth-of-type(7){order:13}.lxf form>p:nth-of-type(8){order:14}\n.lxf form>p:nth-of-type(15){order:15}.lxf form>.wpcf7-response-output,.lxf form>.fusion-alert{order:40}\n.lxf .wpcf7-form-control-wrap{display:block;margin:1px 0 9px}\n.lxf .wpcf7-checkbox,.lxf .wpcf7-radio{display:flex;flex-wrap:wrap;gap:6px}\n.lxf .wpcf7-list-item{margin:0!important}\n.lxf .wpcf7-list-item label{display:block;cursor:pointer;margin:0}\n.lxf .wpcf7-list-item input{position:absolute;opacity:0;width:1px;height:1px}\n.lxf .wpcf7-list-item-label{display:inline-flex;align-items:center;min-height:34px;padding:0 11px;border:1.5px solid #d9eaf3;border-radius:999px;font-size:13px;font-weight:500;color:#0b2a42;background:#fff;transition:background .15s,border-color .15s,color .15s,transform .15s}\n.lxf .wpcf7-list-item label:hover .wpcf7-list-item-label{border-color:#22c2ee;transform:translateY(-1px)}\n.lxf .wpcf7-list-item input:checked+.wpcf7-list-item-label{background:#074672;border-color:#074672;color:#fff}\n.lxf .wpcf7-list-item input:focus-visible+.wpcf7-list-item-label{outline:3px solid #22c2ee;outline-offset:2px}\n.lxf input[type=text],.lxf input[type=tel],.lxf input[type=email],.lxf textarea{width:100%!important;max-width:none!important;height:44px!important;border:1.5px solid #d9eaf3!important;border-radius:12px!important;padding:0 14px!important;font:500 15px Poppins,system-ui,sans-serif!important;color:#0b2a42!important;background:#f7fbfd!important;box-shadow:none!important;transition:border-color .15s,background .15s}\n.lxf textarea{height:44px!important;min-height:0!important;padding:10px 14px!important;resize:none;transition:height .2s,border-color .15s,background .15s}.lxf textarea:focus{height:84px!important}\n.lxf input:focus,.lxf textarea:focus{border-color:#22c2ee!important;background:#fff!important;outline:none!important}\n.lxf input[type=submit]{width:100%!important;height:54px!important;border:0!important;border-radius:999px!important;background:#22c2ee!important;color:#04304f!important;font:600 16.5px Poppins,system-ui,sans-serif!important;letter-spacing:0!important;text-transform:none!important;cursor:pointer;margin-top:6px!important;box-shadow:0 10px 24px rgba(34,194,238,.3)!important;transition:transform .15s,background .15s}\n.lxf input[type=submit]:hover{background:#4fd0f3!important;transform:translateY(-2px)}.lxf input[type=submit]:active{transform:scale(.98)}\n.lxf .wpcf7-spinner{position:absolute}\n.lxf .wpcf7-not-valid-tip{font-size:12.5px;font-weight:500;margin-top:4px}\n.lxf .wpcf7-response-output{margin:12px 0 0!important;border-radius:12px!important;font-size:14px!important;padding:10px 14px!important}\n.lxf .alt{margin:14px 0 0;text-align:center;font-size:14px;color:#52697b}\n.lxf .alt a{color:#074672!important;font-weight:600;white-space:nowrap;border-bottom:1.5px solid #22c2ee}\n@media(min-width:1081px){\n .lxf-wrap{position:absolute!important;top:0;left:0;right:0;height:0;z-index:6}\n .lxf-wrap .lxf{position:absolute;top:178px;right:max(28px,calc((100vw - 1256px)/2 + 28px));width:440px}\n}\n@media(max-width:1080px){\n .lx .hero .w{min-height:0;padding-top:196px;padding-bottom:112px}\n .lxf-wrap{background:var(--wash,#f2f9fc);padding:0 18px 8px!important}\n .lxf-wrap .lxf{position:relative;z-index:6;margin:-64px auto 0;max-width:560px}\n .lx .b.mob{display:inline-flex}\n}\n\n/* inline booking section (other pages) */\n.lx .bookh{background:var(--navy2);padding:96px 0 36px;text-align:center}\n.lx .bookh h2{color:#fff!important}.lx .bookh p{color:#cfe3ee;margin:14px auto 0;max-width:560px;text-align:center}\n.lxf-inl{margin:0!important;background:#04304f;padding:0 20px 96px!important}\n.lxf-inl .lxf{max-width:560px;margin:0 auto}\n.lx .grid.g3{grid-template-columns:repeat(3,minmax(0,1fr))}.lx .featsec .w,.lx .bookh .w{max-width:1180px}\n.lx .card h3{display:flex;flex-wrap:wrap;gap:10px;align-items:center}\n.lx .featsec{padding:28px 0 8px}\n.lx .featsec .eb{margin-bottom:18px}\n/* facts strip */\n.lx .facts{background:#fff;border-bottom:1px solid var(--line)}\n.lx .facts .g{display:grid;grid-template-columns:1.25fr 1.15fr 1fr 1fr}\n.lx .facts .i{padding:30px 28px;border-left:1px solid var(--line);min-width:0}\n.lx .facts .i:first-child{border-left:0;padding-left:0}\n.lx .facts b{display:block;font-size:12.5px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--cyand);margin-bottom:8px}\n.lx .facts span,.lx .facts a{display:block;font-size:15.5px;line-height:1.5;color:var(--ink)!important;font-weight:500}\n.lx .facts a:hover{color:var(--cyand)!important}\n\n/* featured treatments */\n.lx .feat{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:64px;align-items:stretch}\n.lx .ph{position:relative;border-radius:26px;overflow:hidden;min-height:560px;background:var(--wash)}\n.lx .ph img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .6s cubic-bezier(.2,.7,.2,1)}\n.lx .ph:hover img{transform:scale(1.03)}\n.lx .rows{margin-top:34px;border-top:1px solid var(--line)}\n.lx .row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 24px;align-items:center;padding:26px 0;border-bottom:1px solid var(--line);transition:padding .2s,background .2s}\n.lx .row:hover{padding-left:14px;background:linear-gradient(90deg,var(--wash),transparent)}\n.lx .row h3{display:flex;flex-wrap:wrap;align-items:center;gap:12px}\n.lx .gold{display:inline-flex;align-items:center;background:linear-gradient(135deg,#f6dc8a,#c9993a);color:#3b2a05;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.1em;padding:5px 11px;text-transform:uppercase;line-height:1}\n.lx .row p{grid-column:1;font-size:16px}\n.lx .row .go{grid-row:1/span 2;grid-column:2;width:48px;height:48px;border-radius:50%;border:1.5px solid var(--line);display:flex;align-items:center;justify-content:center;color:var(--navy);transition:background .2s,color .2s,border-color .2s,transform .2s}\n.lx .row .go svg{width:18px;height:18px}\n.lx .row:hover .go{background:var(--navy);border-color:var(--navy);color:#fff;transform:translateX(4px)}\n.lx .fin{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:20px;margin-top:30px;background:var(--wash);border-radius:20px;padding:24px 26px}\n.lx .fin p{flex:1 1 300px;font-size:15.5px;color:var(--ink)}\n.lx .fin p b{color:var(--navy);font-weight:600}\n\n/* everyday care */\n.lx .head{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;flex-wrap:wrap;margin-bottom:44px}\n.lx .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}\n.lx .card{display:flex;flex-direction:column;background:#fff;border:1px solid var(--line);border-radius:20px;padding:28px 26px 26px;min-width:0;transition:transform .2s,box-shadow .2s,border-color .2s}\n.lx .card:hover{transform:translateY(-2px);box-shadow:0 18px 40px rgba(7,70,114,.1);border-color:#bfe0ee}\n.lx .card .ic{width:52px;height:52px;border-radius:14px;background:#e4f6fd;color:var(--navy);display:flex;align-items:center;justify-content:center;margin-bottom:22px}\n.lx .card .ic svg{width:26px;height:26px}\n.lx .card.hot{background:var(--navy);border-color:var(--navy)}\n.lx .card.hot h3,.lx .card.hot .t{color:#fff!important}.lx .card.hot p{color:#cfe3ee}.lx .card.hot .ic{background:rgba(255,255,255,.14);color:#fff}\n.lx .card p{font-size:15.5px;margin:10px 0 22px}\n.lx .card .t{margin-top:auto;align-self:flex-start;font-size:15px}\n\n/* brand band */\n.lx .band{background:var(--navy);border-radius:28px;padding:64px;display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:56px;align-items:center}\n.lx .band .eb{color:#8fdcf5}.lx .band h2{color:#fff!important}\n.lx .band p{color:#cfe3ee;margin:16px 0 28px;max-width:520px}\n.lx .band ul{list-style:none;margin:0;padding:0;display:grid;gap:14px}\n.lx .band li{display:flex;gap:14px;align-items:flex-start;color:#fff;font-size:16.5px;line-height:1.45;background:rgba(255,255,255,.08);border-radius:16px;padding:18px 20px;margin:0}\n.lx .band li svg{width:22px;height:22px;flex:none;margin-top:1px}\n\n/* team */\n.lx .split{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:64px;align-items:center}\n.lx .split .ph{min-height:460px}.lx .split .ph img{object-position:50% 18%}\n.lx .chips{display:flex;flex-wrap:wrap;gap:8px;margin:26px 0 30px}\n.lx .chips span{border:1.5px solid var(--line);border-radius:999px;padding:8px 16px;font-size:15px;font-weight:500;color:var(--navy);background:#fff}\n\n/* visit + faq */\n.lx .visit{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:64px;align-items:start}\n.lx dl{margin:30px 0 0;display:grid;grid-template-columns:150px minmax(0,1fr);gap:0}\n.lx dt,.lx dd{margin:0;padding:16px 0;border-top:1px solid var(--line);font-size:16px;line-height:1.55}\n.lx dt{font-weight:600;color:var(--navy)}.lx dd{color:var(--ink)}.lx dd a{color:var(--navy)!important;font-weight:600}\n.lx .hrs{display:grid;grid-template-columns:auto auto;justify-content:start;gap:2px 22px}\n.lx .visit .cta{margin-top:26px;display:flex;flex-wrap:wrap;gap:12px}\n.lx details{border-top:1px solid var(--line)}.lx details:last-of-type{border-bottom:1px solid var(--line)}\n.lx summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:20px 0;font-weight:600;color:var(--navy);font-size:17px;line-height:1.35;transition:color .15s}\n.lx summary::-webkit-details-marker{display:none}\n.lx summary::after{content:\"+\";flex:none;width:32px;height:32px;border-radius:50%;border:1.5px solid var(--line);display:flex;align-items:center;justify-content:center;font-weight:400;font-size:20px;transition:transform .2s,background .2s,color .2s}\n.lx summary:hover{color:var(--cyand)}\n.lx details[open] summary::after{transform:rotate(45deg);background:var(--navy);border-color:var(--navy);color:#fff}\n.lx details p{padding:0 48px 22px 0;font-size:16px}\n\n/* close */\n.lx .end{background:var(--navy2);padding:96px 0;text-align:center}\n.lx .end h2{color:#fff!important}.lx .end p{color:#cfe3ee;margin:16px auto 32px;max-width:560px;text-align:center}\n.lx .end .cta{display:flex;flex-wrap:wrap;gap:14px;justify-content:center}\n\n/* phone action bar */\n.lx-bar{display:none}\n@media(max-width:780px){\n .lx-bar{display:grid;grid-template-columns:1fr 1fr;gap:10px;position:fixed;left:0;right:0;bottom:0;z-index:9990;padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:rgba(255,255,255,.96);backdrop-filter:blur(10px);box-shadow:0 -8px 24px rgba(4,48,79,.14);font-family:Poppins,system-ui,sans-serif}\n .lx-bar a{display:flex;align-items:center;justify-content:center;gap:8px;min-height:50px;border-radius:999px;font-weight:600;font-size:15.5px;text-decoration:none}\n .lx-bar a svg{width:18px;height:18px}\n .lx-bar .c{background:#fff;border:1.5px solid #074672;color:#074672!important}\n .lx-bar .r{background:#22c2ee;color:#04304f!important}\n .lx-bar a{text-decoration:none!important}\n body{padding-bottom:74px}\n .grecaptcha-badge{bottom:88px!important}#toTop,.fusion-top-top-link{display:none!important}.cky-btn-revisit-wrapper{bottom:84px!important}\n .lx .hero .cta{display:none}.lx .rate{margin-top:28px}\n}\n@media(max-width:1080px){\n .lx .sec{padding:72px 0}\n .lx .feat,.lx .split,.lx .visit,.lx .band{grid-template-columns:minmax(0,1fr);gap:40px}\n .lx .ph,.lx .split .ph{min-height:0;aspect-ratio:4/3}\n .lx .grid{grid-template-columns:repeat(2,minmax(0,1fr))}.lx .grid.g3{grid-template-columns:minmax(0,1fr)}\n .lx .facts .g{grid-template-columns:1fr 1fr}\n .lx .facts .i{padding:22px 20px;border-left:0;border-top:1px solid var(--line)}\n .lx .facts .i:nth-child(-n+2){border-top:0}.lx .facts .i:nth-child(odd){padding-left:0}\n .lx .band{padding:44px 30px}\n}\n@media(max-width:800px){.lx .hero .w{padding-top:44px}}\n@media(max-width:640px){\n .lx,.lx p{font-size:16px}.lx .w{padding:0 20px}\n .lx .sec{padding:60px 0}\n .lx .hero .s{font-size:17px}\n .lx .hero .cta .b{width:100%}\n .lx .grid{grid-template-columns:minmax(0,1fr)}\n .lx .facts .g{grid-template-columns:minmax(0,1fr)}\n .lx .facts .i,.lx .facts .i:nth-child(-n+2){padding:18px 0;border-top:1px solid var(--line)}.lx .facts .i:first-child{border-top:0}\n .lx dl{grid-template-columns:minmax(0,1fr)}.lx dt{padding-bottom:0}.lx dd{border-top:0;padding-top:4px}\n .lx .fin .b,.lx .end .b,.lx .visit .cta .b,.lx .head .b{width:100%}\n .lx .band{border-radius:22px;padding:36px 22px}\n .lx details p{padding-right:0}\n .lxf{padding:24px 20px 22px;border-radius:20px}.lxf h2{font-size:22px!important}\n}\n/* ===== wide layout: content runs to fluid side margins, header and footer aligned to the same edges ===== */\n.lx{--gut:clamp(20px,4.6vw,96px)}\n.lx .w,.lx .featsec .w,.lx .bookh .w{max-width:calc(1760px + 2*var(--gut));padding:0 var(--gut)}\nbody .fusion-secondary-header .fusion-row,body .fusion-header .fusion-row,body .fusion-footer .fusion-row{max-width:calc(1760px + 2*clamp(20px,4.6vw,96px))!important;padding-left:clamp(20px,4.6vw,96px)!important;padding-right:clamp(20px,4.6vw,96px)!important;box-sizing:border-box}\n.lx h1{font-size:clamp(34px,3.7vw,68px)!important}\n.lx h2{font-size:clamp(28px,2.7vw,48px)!important}\n.lx .hero .txt{max-width:700px}.lx .hero .s{max-width:620px}\n@media(min-width:1081px){.lxf-wrap .lxf{right:max(clamp(20px,4.6vw,96px),calc((100vw - 1760px)/2));width:clamp(440px,28vw,500px)}}\n@media(min-width:1500px){\n .lx .hero .w{min-height:920px}\n .lx .feat{grid-template-columns:minmax(0,6fr) minmax(0,6fr);gap:96px}\n .lx .ph{min-height:680px}\n .lx .grid{gap:28px}.lx .card{padding:36px 34px 32px}\n .lx .band{padding:88px 96px;gap:96px}\n .lx .split{gap:96px}.lx .split .ph{min-height:600px}\n .lx .sec{padding:128px 0}\n}\n/* visit: details beside a live map */\n.lx .visit{grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:clamp(40px,5vw,96px);align-items:stretch}\n.lx .map{position:relative;border-radius:26px;overflow:hidden;min-height:520px;background:#dfeef5;border:1px solid var(--line)}\n.lx .map iframe{position:absolute;inset:0;width:100%;height:100%;border:0}\n/* faq: heading beside the questions */\n.lx .faqs{display:grid;grid-template-columns:minmax(0,4fr) minmax(0,7fr);gap:clamp(40px,6vw,128px);align-items:start}\n.lx .fq-h{position:sticky;top:140px}.lx .fq-h .b{margin-top:28px}\n.lx .fq-l details p{max-width:820px}\n.lx .row{margin-left:0!important;margin-right:0!important}\nbody .fusion-header .fusion-row{justify-content:flex-start!important}@media(min-width:1001px){body .fusion-header .fusion-main-menu{margin-left:auto!important}}\nbody .fusion-secondary-header{padding-left:0!important;padding-right:0!important}\n@media(max-width:1080px){.lx .visit,.lx .faqs{grid-template-columns:minmax(0,1fr);gap:36px}.lx .fq-h{position:static}.lx .map{min-height:0;aspect-ratio:4/3}}\n@media(max-width:640px){.lx .fq-h .b{width:100%}.lx .map{aspect-ratio:1/1}}\n";
const PAGECSS = `
/* ===== inner pages ===== */
.lx .ih{position:relative;background:var(--navy2);overflow:hidden}
.lx .ih::before{content:"";position:absolute;inset:0;background:radial-gradient(120% 90% at 100% 0%,rgba(34,194,238,.16),transparent 55%)}
.lx .ih .w{position:relative;z-index:1;display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:clamp(40px,5vw,104px);align-items:center;padding-top:196px;padding-bottom:96px;min-height:660px}
.lx .ih .w.solo{grid-template-columns:minmax(0,1fr);min-height:520px}
.lx .ih .eb{color:#8fdcf5}
.lx .ih h1{max-width:20ch}
.lx .ih .s{color:#d7e8f2;font-size:19px;line-height:1.6;margin-top:22px;max-width:640px}
.lx .ih .cta{display:flex;flex-wrap:wrap;gap:14px;margin-top:34px}
.lx .ih .pic{position:relative;border-radius:26px;overflow:hidden;aspect-ratio:5/4;background:#0d3b5e;box-shadow:0 30px 70px rgba(0,0,0,.28)}
.lx .ih .pic img,.lx .md>.pic img,.lx .person .pic img,.lx .mem .pic img,.lx .gal img,.lx .group img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .6s cubic-bezier(.2,.7,.2,1)}
.lx .ih .pic:hover img,.lx .md>.pic:hover img,.lx .person .pic:hover img,.lx .mem:hover .pic img,.lx .gal a:hover img,.lx .gal div:hover img{transform:scale(1.03)}
@media(prefers-reduced-motion:no-preference){.lx .ih .w>*{animation:lxin .6s cubic-bezier(.2,.7,.2,1) both}.lx .ih .w>*:nth-child(2){animation-delay:.12s}}
.lx .ed{display:grid;grid-template-columns:minmax(0,4fr) minmax(0,8fr);gap:clamp(32px,5vw,112px);align-items:start}
.lx .ed>.hd{position:sticky;top:140px}
.lx .ed>.prose.full{grid-column:1/-1}
.lx .md{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(40px,5vw,112px);align-items:center}
.lx .md.flip>.pic{order:-1}
.lx .md>.pic{position:relative;border-radius:26px;overflow:hidden;aspect-ratio:4/3;background:var(--wash)}
.lx .md h2{margin-bottom:22px!important}
.lx .prose{max-width:820px}
.lx .prose p{margin:0 0 18px;font-size:17.5px;line-height:1.7}
.lx .prose>*:last-child{margin-bottom:0}
.lx .prose a{color:var(--navy)!important;font-weight:600;border-bottom:1.5px solid var(--cyan);transition:color .15s}
.lx .prose a:hover{color:var(--cyand)!important}
.lx .prose strong,.lx .prose b{color:var(--ink);font-weight:600}
.lx .prose h3{margin:30px 0 12px!important;font-size:21px!important}
.lx .prose h3:first-child{margin-top:0!important}
.lx .prose ul,.lx .prose ol{margin:4px 0 22px;padding:0;list-style:none;display:grid;gap:10px}
.lx .prose li{position:relative;padding:14px 18px 14px 52px;background:var(--wash);border-radius:14px;margin:0;font-size:16.5px;line-height:1.5;color:var(--ink)}
.lx .wash .prose li{background:#fff}
.lx .prose ul>li::before{content:"";position:absolute;left:16px;top:14px;width:22px;height:22px;border-radius:50%;background:#22c2ee url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M6 12.5l3.8 3.8L18 8' fill='none' stroke='%2304304f' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/15px no-repeat}
.lx .prose ol{counter-reset:o}.lx .prose ol>li{counter-increment:o}
.lx .prose ol>li::before{content:counter(o);position:absolute;left:14px;top:13px;width:26px;height:26px;border-radius:50%;background:var(--navy);color:#fff;font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:center}
@media(min-width:1300px){.lx .prose ul.many{grid-template-columns:1fr 1fr;max-width:none}}
.lx .prose table{width:100%;border-collapse:collapse;margin:8px 0 22px;font-size:16px}.lx .prose td,.lx .prose th{border-bottom:1px solid var(--line);padding:12px 10px;text-align:left}
.lx .vid{position:relative;aspect-ratio:16/9;border-radius:20px;overflow:hidden;margin:8px 0 22px}.lx .vid iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.lx .gal{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px;margin-top:clamp(40px,4vw,64px)}
.lx .gal>div{position:relative;border-radius:22px;overflow:hidden;aspect-ratio:4/3;background:var(--wash)}
/* short sections as a card grid */
.lx .cg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}
.lx .cg.c2{grid-template-columns:repeat(2,minmax(0,1fr))}
.lx .cg>div{background:#fff;border:1px solid var(--line);border-radius:22px;padding:32px 30px;transition:transform .2s,box-shadow .2s,border-color .2s}
.lx .wash .cg>div{border-color:#d4e9f2}
.lx .cg>div:hover{transform:translateY(-2px);box-shadow:0 18px 40px rgba(7,70,114,.08);border-color:#bfe0ee}
.lx .cg h3{margin-bottom:14px!important;display:flex;gap:14px;align-items:center}
.lx .cg h3 i{flex:none;font-style:normal;width:34px;height:34px;border-radius:50%;background:#e4f6fd;color:var(--navy);font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:center}
.lx .cg .prose{max-width:none}.lx .cg .prose p{font-size:16.5px}
.lx .sh{margin-bottom:clamp(36px,4vw,56px);max-width:900px}
/* team */
.lx .people{display:grid;gap:clamp(72px,8vw,136px)}
.lx .person{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:clamp(40px,5vw,112px);align-items:start}
.lx .person.flip>.pic{order:2}
.lx .person .pic{position:sticky;top:140px;border-radius:26px;overflow:hidden;aspect-ratio:4/5;background:var(--wash)}
.lx .person .pic img{object-position:50% 20%}
.lx .person .cred{display:block;color:var(--cyand);font-weight:600;font-size:15px;letter-spacing:.04em;margin:12px 0 26px}
.lx .logos{display:flex;flex-wrap:wrap;gap:30px;align-items:center;margin-top:30px;padding-top:26px;border-top:1px solid var(--line)}
.lx .logos img{height:46px;width:auto;max-width:170px;object-fit:contain;filter:grayscale(1);opacity:.75;transition:filter .2s,opacity .2s}
.lx .logos img:hover{filter:none;opacity:1}
.lx .crew{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:24px}
.lx .mem .pic{position:relative;border-radius:22px;overflow:hidden;aspect-ratio:3/4;background:var(--wash)}
.lx .mem .pic img{object-position:50% 18%}
.lx .mem h3{margin-top:18px!important;font-size:19px!important}.lx .mem span{display:block;color:var(--mut);font-size:15px;margin-top:4px}
.lx .group{position:relative;border-radius:28px;overflow:hidden;aspect-ratio:21/8;background:var(--wash)}
.lx .group img{object-position:50% 35%}
/* booking / form section */
.lx-bkw{margin:0!important}
.lx .bk{background:var(--navy2);padding:clamp(72px,8vw,128px) 0}
.lx .bk .w{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);gap:clamp(40px,6vw,128px);align-items:center}
.lx .bk h2{color:#fff!important}.lx .bk .lxf h2,.lx .lxf h2{color:#074672!important;font-size:25px!important;line-height:1.2!important;font-weight:600!important;letter-spacing:-.02em!important}.lx .card p:empty{display:none}.lx .card h3{margin-bottom:22px!important}.lx .bk .eb{color:#8fdcf5}
.lx .bk p.s{color:#cfe3ee;margin-top:16px;max-width:520px;font-size:18px}
.lx .bk ul{list-style:none;margin:28px 0 0;padding:0;display:grid;gap:12px}
.lx .bk li{display:flex;gap:12px;align-items:flex-start;color:#fff;margin:0;font-size:16.5px;line-height:1.45}.lx .bk li svg{width:22px;height:22px;flex:none}
.lx .bk .b{margin-top:30px}
.lx .bk .lxf{max-width:680px;width:100%;justify-self:end;box-shadow:0 30px 80px rgba(0,0,0,.3)}
.lx .lxg form>*{order:0!important;grid-column:1/-1!important}
.lx .lxg form>p{margin-bottom:6px!important}
.lx .ct{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);gap:clamp(40px,6vw,128px);align-items:start}
.lx .ct>div:first-child{grid-row:1/span 2}.lx .ct{row-gap:28px}.lx .ct .lxf{box-shadow:0 24px 60px rgba(4,48,79,.14);border:1px solid var(--line)}
.lx .mapw{position:relative;border-radius:28px;overflow:hidden;height:clamp(380px,38vw,560px);background:#dfeef5;border:1px solid var(--line)}
.lx .mapw iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.lx .legal{max-width:960px}.lx .legal h1,.lx .legal h2{font-size:clamp(24px,2vw,32px)!important;margin:40px 0 14px!important}.lx .legal h3{margin:28px 0 10px!important}.lx .legal p,.lx .legal li{font-size:16.5px;line-height:1.7;color:var(--mut)}.lx .legal ul{padding-left:22px;margin:0 0 18px}
@media(max-width:1080px){
 .lx .ih .w{grid-template-columns:minmax(0,1fr);min-height:0;padding-bottom:72px}
 .lx .ih .pic{aspect-ratio:16/10;max-width:720px}
 .lx .ed,.lx .md,.lx .person,.lx .bk .w,.lx .ct{grid-template-columns:minmax(0,1fr);gap:32px}.lx .ct>div{grid-column:auto!important;grid-row:auto!important}
 .lx .ed>.hd,.lx .person .pic{position:static}
 .lx .md.flip>.pic{order:0}.lx .md>.pic{order:-1}
 .lx .person.flip>.pic{order:0}.lx .person .pic{max-width:520px;aspect-ratio:4/4.4}
 .lx .cg{grid-template-columns:repeat(2,minmax(0,1fr))}
 .lx .crew{grid-template-columns:repeat(3,minmax(0,1fr))}
 .lx .bk .lxf{justify-self:stretch;max-width:none}
 .lx .group{aspect-ratio:16/9}
}
@media(max-width:800px){.lx .ih .w{padding-top:44px}}
@media(max-width:640px){
 .lx .cg,.lx .cg.c2{grid-template-columns:minmax(0,1fr)}.lx .cg>div{padding:26px 22px}
 .lx .crew{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
 .lx .ih .cta .b,.lx .bk .b{width:100%}
 .lx .prose li{padding:13px 14px 13px 48px}
 .lx .logos{gap:20px}.lx .logos img{height:36px}
}
`;
const ORIGIN = 'https://www.cliniquedentairelacite.com';
const UP = '/wp-content/uploads/';
const POOL = ['2021/04/CLINIQUE_DENTAIRE_LA_CITE-205.jpg','2021/04/CLINIQUE_DENTAIRE_LA_CITE-198.jpg','2021/04/CLINIQUE_DENTAIRE_LA_CITE-187.jpg','2021/04/CLINIQUE_DENTAIRE_LA_CITE-112-1.jpg','2021/04/CLINIQUE_DENTAIRE_LA_CITE-105-1.jpg','2021/04/CLINIQUE_DENTAIRE_LA_CITE-93.jpg','2021/04/CLINIQUE_DENTAIRE_LA_CITE-66.jpg','2021/04/CLINIQUE_DENTAIRE_LA_CITE-39.jpg'];
const GROUP = '2025/02/0J3A7208retouches-1024x688.jpg';
const TEL = 'tel:+14382556247', TELTXT = '(438) 255-6247';
const MAPEMBED = 'https://www.google.com/maps?q=Clinique+Dentaire+La+Cit%C3%A9,+300+rue+L%C3%A9o-Pariseau,+Montr%C3%A9al&output=embed';
const MAPS = 'https://www.google.com/maps/dir/?api=1&destination=300+rue+L%C3%A9o-Pariseau+bureau+920+Montr%C3%A9al+QC+H2X+4B3';
const ico = (d,c='') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${c}>${d}</svg>`;
const AR = ico('<path d="M5 12h14M13 6l6 6-6 6"/>',' class="ar"');
const PHONE = ico('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>');
const CAL = ico('<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>');
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#22c2ee"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#04304f" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const L = {
 fr:{book:'Demander un rendez-vous',call:`Appeler le ${TELTXT}`,more:'En savoir plus',rel:'Autres traitements',all:'Voir tous les services',allUrl:'/nos-services/',
  bkEb:'Rendez-vous',bkH:'Prenez rendez-vous',bkP:'Remplissez le formulaire : notre équipe vous répond en moins de 24 heures.',bkLi:['Nouveaux patients acceptés','Urgences reçues le jour même','3 heures de stationnement intérieur gratuit'],
  formH:'Demander un rendez-vous',formSub:'Notre équipe vous répond en moins de 24 heures.',bookForm:371,
  f:[['Heures d’ouverture',['Lun., mar., jeu. : 8 h à 17 h','Mer. : 7 h à 17 h · Ven. : 8 h à 16 h']],['Adresse',['300, rue Léo-Pariseau, bureau 920','Immeuble Air Transat, Montréal']],['Stationnement',['Intérieur, gratuit pendant 3 heures']]],ftel:'Téléphone',
  dl:[['Adresse','300, rue Léo-Pariseau, bureau 920<br>Montréal (Québec) H2X 4B3<br>Immeuble Air Transat, au croisement de l’avenue du Parc'],['Heures','<span class="hrs"><span>Lundi</span><span>8 h à 17 h</span><span>Mardi</span><span>8 h à 17 h</span><span>Mercredi</span><span>7 h à 17 h</span><span>Jeudi</span><span>8 h à 17 h</span><span>Vendredi</span><span>8 h à 16 h</span></span>'],['Téléphone',`<a href="${TEL}">${TELTXT}</a>`],['Courriel','<a href="mailto:cliniquedentairelacite@cdlc.ca">cliniquedentairelacite@cdlc.ca</a>'],['Stationnement','Stationnement intérieur gratuit pendant 3 heures pour nos patients.'],['Métro','Près des stations Place-des-Arts et Sherbrooke, à deux pas de l’Université McGill.']],
  route:'Obtenir l’itinéraire',mapT:'Carte : Clinique dentaire La Cité, 300, rue Léo-Pariseau',ctH:'Écrivez-nous',ctSub:'Une question ? Nous vous répondons rapidement.',ctEb:'Nous joindre',
  dentists:'Nos dentistes',staff:'Nos hygiénistes',staffP:'Une équipe d’hygiénistes attentionnés, avec vous à chaque nettoyage.',teamLead:'Des dentistes et un personnel de soutien à l’écoute, avec respect, honnêteté et douceur — et un accueil dans votre langue.',
  draft:'nouvelle version (brouillon SSS)',sfx:'-nouveau'},
 en:{book:'Request an appointment',call:`Call ${TELTXT}`,more:'Learn more',rel:'Other treatments',all:'See all services',allUrl:'/en/our-services/',
  bkEb:'Appointments',bkH:'Book your appointment',bkP:'Fill in the form: our team replies within 24 hours.',bkLi:['New patients welcome','Emergencies seen the same day','3 hours of free indoor parking'],
  formH:'Request an appointment',formSub:'Our team replies within 24 hours.',bookForm:1249,
  f:[['Opening hours',['Mon, Tue, Thu: 8 am to 5 pm','Wed: 7 am to 5 pm · Fri: 8 am to 4 pm']],['Address',['300 Léo-Pariseau Street, suite 920','Air Transat building, Montréal']],['Parking',['Indoor, free for 3 hours']]],ftel:'Phone',
  dl:[['Address','300 Léo-Pariseau Street, suite 920<br>Montréal, Québec H2X 4B3<br>Air Transat building, at Parc Avenue'],['Hours','<span class="hrs"><span>Monday</span><span>8 am to 5 pm</span><span>Tuesday</span><span>8 am to 5 pm</span><span>Wednesday</span><span>7 am to 5 pm</span><span>Thursday</span><span>8 am to 5 pm</span><span>Friday</span><span>8 am to 4 pm</span></span>'],['Phone',`<a href="${TEL}">${TELTXT}</a>`],['Email','<a href="mailto:cliniquedentairelacite@cdlc.ca">cliniquedentairelacite@cdlc.ca</a>'],['Parking','Free indoor parking for 3 hours for our patients.'],['Metro','Near Place-des-Arts and Sherbrooke stations, steps from McGill University.']],
  route:'Get directions',mapT:'Map: Clinique dentaire La Cité, 300 Léo-Pariseau Street',ctH:'Write to us',ctSub:'A question? We will get back to you quickly.',ctEb:'Contact us',
  dentists:'Our dentists',staff:'Our hygienists',staffP:'A caring team of hygienists, with you at every cleaning.',teamLead:'Dentists and support staff who listen, with respect, honesty and a gentle touch — and a welcome in your language.',
  draft:'new version (SSS draft)',sfx:'-new'}
};
const EB = {fr:{service:'Nos services',postop:'Soins après traitement',clinic:'La clinique',patients:'Patients',team:'Notre équipe',contact:'Nous joindre',legal:'Informations légales',blog:'Blogue'},
            en:{service:'Our services',postop:'Aftercare',clinic:'The clinic',patients:'Patients',team:'Our team',contact:'Contact us',legal:'Legal information',blog:'Blog'}};
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const fixTxt = s => s.replace(/plus de 40 ans/g,'plus de 50 ans').replace(/more than 40 years/gi,'more than 50 years')
  .replace(/tel:\+?1?-?514-?288-?8531/g,TEL).replace(/\(?514\)?[\s.\- ]?288[\s.\-]?8531/g,'438 255-6247');
const imgSrc = i => { for (const a of ['data-orig-src','data-src','data-lazy-src','src']) { const v=i.getAttribute(a); if (v && !v.startsWith('data:')) return v; } return ''; };
const isLogo = (src,w) => /logo|feuille_border|icone|icon|\.svg|\.png$/i.test(src) || (w && +w < 260);
const fullSize = src => src.replace(/-\d{2,4}x\d{2,4}(\.\w+)$/,'$1');

function clean(el){
  const t = document.createElement('div'); t.innerHTML = el.innerHTML;
  const walk = n => { [...n.childNodes].forEach(c => {
    if (c.nodeType===3) return;
    if (c.nodeType!==1) { c.remove(); return; }
    walk(c);
    const tag=c.tagName;
    if (['A','STRONG','B','EM','I','BR','U','SUP','SUB'].includes(tag)) {
      const keep = tag==='A' ? {href:c.getAttribute('href'),target:c.getAttribute('target')} : null;
      [...c.attributes].forEach(a=>c.removeAttribute(a.name));
      if (keep) { if (keep.href) c.setAttribute('href',keep.href); if (keep.target==='_blank') { c.setAttribute('target','_blank'); c.setAttribute('rel','noopener'); } }
    } else if (['IMG','SCRIPT','STYLE','svg','SVG','NOSCRIPT','IFRAME','FORM','INPUT','BUTTON'].includes(tag)) c.remove();
    else c.replaceWith(...c.childNodes);
  }); };
  walk(t);
  return fixTxt(t.innerHTML.replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim());
}

function extract(html){
  const d = new DOMParser().parseFromString(html,'text/html');
  const root = d.querySelector('#content .post-content') || d.querySelector('#content') || d.body;
  const out = []; let stop = false;
  const SKIP = 'form,.wpcf7,script,style,noscript,.fusion-sharing-box,.related-posts,.project-info,.fusion-meta-info,.fusion-comments,nav,.fusion-pagination';
  const walk = node => { for (const c of node.children) { if (stop) return;
    if (c.matches(SKIP)) { if (c.matches('form,.wpcf7')) out.push({t:'form'}); continue; }
    const tag = c.tagName;
    if (/^H[1-4]$/.test(tag)) { const tx=c.textContent.replace(/\s+/g,' ').trim(); if (/^(Project Details|Détails du projet|Categories:?|Catégories\s*:?)$/i.test(tx)) { stop=true; return; } if (tx) out.push({t:'h',lvl:+tag[1],text:fixTxt(tx),lines:c.innerText!==undefined?null:null,raw:c.innerHTML}); continue; }
    if (tag==='IMG') { const s=imgSrc(c); if (s) out.push({t:'img',src:s,w:c.getAttribute('width'),alt:c.getAttribute('alt')||''}); continue; }
    if (tag==='P'||tag==='BLOCKQUOTE') { c.querySelectorAll('img').forEach(i=>{const s=imgSrc(i); if(s) out.push({t:'img',src:s,w:i.getAttribute('width'),alt:i.getAttribute('alt')||''});}); const h=clean(c); if (h.replace(/<br\s*\/?>/g,'').trim()) out.push({t:'p',html:h}); continue; }
    if (tag==='UL'||tag==='OL') { const items=[...c.children].filter(li=>li.tagName==='LI').map(clean).filter(Boolean); if (items.length) out.push({t:tag.toLowerCase(),items}); continue; }
    if (tag==='IFRAME') { const s=c.getAttribute('src')||c.dataset.src||''; if (/youtube|vimeo/.test(s)) out.push({t:'vid',src:s}); continue; }
    if (tag==='TABLE') { out.push({t:'table',html:fixTxt(c.outerHTML.replace(/ (class|style|width|height)="[^"]*"/g,''))}); continue; }
    const loose = [...c.childNodes].some(n=>n.nodeType===3 && n.textContent.trim());
    if (loose && !c.querySelector('p,ul,ol,h1,h2,h3,h4,div,table,form')) { c.querySelectorAll('img').forEach(i=>{const s=imgSrc(i); if(s) out.push({t:'img',src:s,w:i.getAttribute('width'),alt:i.getAttribute('alt')||''});}); c.innerHTML.split(/(?:<br\s*\/?>\s*){2,}/i).forEach(part=>{const tmp=document.createElement('div'); tmp.innerHTML=part; const h=clean(tmp); if (h.replace(/<br\s*\/?>/g,'').trim()) out.push({t:'p',html:h});}); continue; }
    if (loose) { [...c.childNodes].filter(n=>n.nodeType===3 && n.textContent.trim().length>2).forEach(n=>out.push({t:'p',html:fixTxt(esc(n.textContent.trim()))})); }
    walk(c);
  } };
  walk(root);
  return out;
}

function sectionize(blocks, pageTitle){
  let h1 = null; const secs = []; let cur = {h:null,blocks:[],imgs:[]};
  for (const b of blocks) {
    if (b.t==='form') continue;
    if (b.t==='h' && b.lvl===1 && !h1 && !secs.length && !cur.blocks.length) { h1 = b.text; continue; }
    if (b.t==='h' && b.lvl<=2) { if (cur.h||cur.blocks.length||cur.imgs.length) secs.push(cur); cur={h:b.text,blocks:[],imgs:[]}; continue; }
    if (b.t==='img') { if (!isLogo(b.src,b.w)) cur.imgs.push(b); continue; }
    cur.blocks.push(b);
  }
  if (cur.h||cur.blocks.length||cur.imgs.length) secs.push(cur);
  // images in a text-less section move to the next one
  for (let i=0;i<secs.length;i++) if (!secs[i].blocks.length && !secs[i].h && secs[i].imgs.length && secs[i+1]) { secs[i+1].imgs.unshift(...secs[i].imgs); secs[i].imgs=[]; }
  const res = secs.filter(s=>s.blocks.length||s.imgs.length);
  let lead = null;
  if (res.length && !res[0].h && res[0].blocks[0] && res[0].blocks[0].t==='p') { lead = res[0].blocks.shift().html; if (!res[0].blocks.length && !res[0].imgs.length) res.shift(); }
  return {h1: h1||pageTitle, lead, secs: res};
}

const tlen = s => s.blocks.reduce((n,b)=>n+(b.html||'').length+(b.items||[]).join('').length,0);
function bodyHtml(blocks){
  return blocks.map(b => b.t==='p' ? `<p>${b.html}</p>`
    : (b.t==='ul'||b.t==='ol') ? `<${b.t}${b.items.length>=4&&b.items.every(x=>x.length<140)?' class="many"':''}>${b.items.map(x=>`<li>${x}</li>`).join('')}</${b.t}>`
    : b.t==='h' ? `<h3>${esc(b.text)}</h3>`
    : b.t==='vid' ? `<div class="vid"><iframe src="${esc(b.src)}" loading="lazy" allowfullscreen title="Vidéo"></iframe></div>`
    : b.t==='table' ? b.html : '').join('');
}
const imgTag = (src,alt,eager) => `<img src="${esc(src)}" alt="${esc(alt||'')}"${eager?' fetchpriority="high"':' loading="lazy"'}>`;

function renderSecs(secs, startWash){
  let html = '', bgi = startWash?1:0, flip = false, i = 0;
  while (i < secs.length) {
    // run of 3+ short text-only headed sections -> one card grid
    let j = i; while (j < secs.length && secs[j].h && !secs[j].imgs.length && tlen(secs[j]) < 520 && !secs[j].blocks.some(b=>b.t==='vid'||b.t==='table')) j++;
    const bg = (bgi++%2) ? ' wash' : '';
    if (j - i >= 3) {
      const run = secs.slice(i,j);
      html += `<section class="sec${bg}"><div class="w"><div class="cg${run.length===4?' c2':''}">${run.map((s,k)=>`<div><h3><i>${k+1}</i>${esc(s.h)}</h3><div class="prose">${bodyHtml(s.blocks)}</div></div>`).join('')}</div></div></section>`;
      i = j; continue;
    }
    const s = secs[i]; i++;
    const extra = s.imgs.slice(1);
    const gal = extra.length ? `<div class="gal">${extra.map(m=>`<div>${imgTag(fullSize(m.src),m.alt)}</div>`).join('')}</div>` : '';
    if (s.imgs.length) {
      html += `<section class="sec${bg}"><div class="w"><div class="md${flip?' flip':''}"><div>${s.h?`<h2>${esc(s.h)}</h2>`:''}<div class="prose">${bodyHtml(s.blocks)}</div></div><div class="pic">${imgTag(fullSize(s.imgs[0].src),s.imgs[0].alt)}</div></div>${gal}</div></section>`;
      flip = !flip;
    } else if (s.h) {
      html += `<section class="sec${bg}"><div class="w ed"><div class="hd"><h2>${esc(s.h)}</h2></div><div class="prose">${bodyHtml(s.blocks)}</div></div></section>`;
    } else {
      html += `<section class="sec${bg}"><div class="w ed"><div class="prose full">${bodyHtml(s.blocks)}</div></div></section>`;
    }
  }
  return html;
}

function hero(l, eb, h1, lead, pic, alt){
  const t = L[l];
  return `<section class="ih"><div class="w${pic?'':' solo'}"><div><span class="eb">${esc(eb)}</span><h1>${esc(h1)}</h1>${lead?`<p class="s">${lead}</p>`:''}<div class="cta"><a class="b b1" href="#rdv">${CAL}${t.book}</a><a class="b b2 on-dark" href="${TEL}">${PHONE}${t.call}</a></div></div>${pic?`<div class="pic">${imgTag(pic,alt,true)}</div>`:''}</div></section>`;
}
function facts(l){
  const t = L[l];
  return `<div class="facts"><div class="w"><div class="g">${t.f.map(([k,v])=>`<div class="i"><b>${k}</b>${v.map(x=>`<span>${x}</span>`).join('')}</div>`).join('')}<div class="i"><b>${t.ftel}</b><a href="${TEL}">${TELTXT}</a></div></div></div></div>`;
}
function booking(l, formId, h, p){
  const t = L[l]; const isBook = !formId || formId===t.bookForm; const fid = formId || t.bookForm;
  return `<div class="lx"><section class="bk"><div class="w"><div><span class="eb">${t.bkEb}</span><h2>${esc(h||t.bkH)}</h2><p class="s">${p||t.bkP}</p><ul>${t.bkLi.map(x=>`<li>${CHECK}<span>${x}</span></li>`).join('')}</ul><a class="b b2 on-dark" href="${TEL}">${PHONE}${t.call}</a></div><div class="lxf${isBook?'':' lxg'}" id="rdv"><h2>${isBook?t.formH:esc(h||t.formH)}</h2><p class="sub">${t.formSub}</p>[contact-form-7 id="${fid}"]</div></div></section></div>`;
}
const bar = (l, book) => `<div class="lx-bar"><a class="c" href="${TEL}">${PHONE}${l==='fr'?'Appeler':'Call'}</a><a class="r" href="${book}">${CAL}${l==='fr'?'Rendez-vous':'Appointment'}</a></div>`;

function b64(s){ const u=new TextEncoder().encode(s); let b=''; for (let i=0;i<u.length;i+=8192) b+=String.fromCharCode.apply(null,u.subarray(i,i+8192)); return btoa(b); }
const OPEN = '[fusion_builder_container hundred_percent="yes" hundred_percent_height="no" padding_top="0px" padding_bottom="0px" padding_left="0px" padding_right="0px" margin_top="0px" margin_bottom="0px"][fusion_builder_row][fusion_builder_column type="1_1" layout="1_1" spacing="0px" padding_top="0px" padding_bottom="0px" padding_left="0px" padding_right="0px" margin_top="0px" margin_bottom="0px"]';
const CLOSE = '[/fusion_builder_column][/fusion_builder_row][/fusion_builder_container]';
const code = h => `[fusion_code]${b64(h)}[/fusion_code]`;
const text = (h, cls) => `[fusion_text class="${cls||'lx-bkw'}"]${h}[/fusion_text]`;
const STYLE = () => `<style>${BASECSS}${PAGECSS}</style>`;

function team(l, html, title){
  const t = L[l];
  const d = new DOMParser().parseFromString(html,'text/html');
  const root = d.querySelector('#content .post-content') || d.querySelector('#content');
  const all = [...root.querySelectorAll('h1,h2,h3,h4,p,ul,ol,img')].filter(e => !e.parentElement.closest('p,ul,ol,h1,h2,h3,h4'));
  const people = []; const photoQ = []; let cur = null;
  for (const e of all) {
    if (e.tagName==='IMG') { const s=imgSrc(e), w=e.getAttribute('width'); if (!s) continue;
      if (/0J3A7208/.test(s)) continue;
      if (isLogo(s,w) && !/\.jpg$/i.test(s)) { if (cur && !/feuille/.test(s)) cur.logos.push(s); }
      else if (/brebeuf/i.test(s)) { if (cur) cur.logos.push(s); }
      else photoQ.push(s);
      continue; }
    if (e.tagName==='H1') { const lines = e.innerHTML.split(/<br\s*\/?>/i).map(x=>x.replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').trim()).filter(Boolean);
      cur = {name:lines[0], cred:lines.slice(1).join(' '), role:'', photo:photoQ.shift()||null, logos:[], body:[]}; people.push(cur); continue; }
    if (!cur) continue;
    if (/^H[2-4]$/.test(e.tagName)) { const tx=e.textContent.trim(); if (!cur.body.length && !cur.role) cur.role=tx; else cur.body.push({t:'h',lvl:3,text:tx}); continue; }
    if (e.tagName==='P') { e.querySelectorAll('img').forEach(i=>{const s=imgSrc(i); if (s && /logo|brebeuf/i.test(s)) cur.logos.push(s); else if (s) photoQ.push(s);}); const h=clean(e); if (h.replace(/<br\s*\/?>/g,'').trim()) cur.body.push({t:'p',html:h}); continue; }
    const items=[...e.children].filter(li=>li.tagName==='LI').map(clean).filter(Boolean); if (items.length) cur.body.push({t:e.tagName.toLowerCase(),items});
  }
  // portraits are queued in document order and taken one per name
  const docs = people.filter(p => p.body.length);
  const crew = people.filter(p => !p.body.length);
  const pBlock = (p,i) => `<article class="person${i%2?' flip':''}"><div class="pic">${p.photo?imgTag(fullSize(p.photo),p.name):''}</div><div><h2>${esc(p.name)}</h2>${p.cred?`<span class="cred">${esc(p.cred)}</span>`:'<span class="cred"></span>'}<div class="prose">${bodyHtml(p.body)}</div>${p.logos.length?`<div class="logos">${[...new Set(p.logos)].map(s=>`<img src="${esc(s)}" alt="" loading="lazy">`).join('')}</div>`:''}</div></article>`;
  const a = STYLE() + `<div class="lx">${hero(l, EB[l].team, l==='fr'?'Rencontrez notre équipe':'Meet our team', t.teamLead, UP+GROUP, title)}
<section class="sec"><div class="w"><div class="sh"><span class="eb">${t.dentists}</span></div><div class="people">${docs.map(pBlock).join('')}</div></div></section>
${crew.length?`<section class="sec wash"><div class="w"><div class="sh"><span class="eb">${t.staff}</span><h2>${t.staff}</h2><p class="lead">${t.staffP}</p></div><div class="crew">${crew.map(p=>`<div class="mem"><div class="pic">${p.photo?imgTag(fullSize(p.photo),p.name):''}</div><h3>${esc(p.name)}</h3><span>${esc(p.role)}</span></div>`).join('')}</div></div></section>`:''}
${facts(l)}</div>`;
  return {a, people: people.map(p=>p.name+(p.photo?'':' (no photo)')).join(', ')};
}

async function getRaw(id, type){
  const r = await fetch(`/wp-json/wp/v2/${type}/${id}?context=edit&_fields=content,title,slug,link`, {credentials:'include', headers:{'X-WP-Nonce':window.__NONCE}});
  return r.json();
}

async function build(pg, idx){
  const l = pg.l, t = L[l];
  const src = await getRaw(pg.id, pg.type==='service'?'avada_portfolio':'pages');
  const raw = src.content.raw;
  const title = (new DOMParser().parseFromString(src.title.raw,'text/html')).body.textContent.trim();
  const formIds = [...raw.matchAll(/\[contact-form-7[^\]]*id="?(\d+)/g)].map(m=>+m[1]);
  const html = await (await fetch(pg.link + (pg.link.includes('?')?'&':'?') + 'x=' + Date.now(), {credentials:'omit'})).text();
  const kind = pg.kind;
  const eb = EB[l][kind] || EB[l].patients;
  const pic = UP + POOL[(idx*3) % POOL.length];
  let content = '', note = '';
  const bookTarget = '#rdv';
  if (kind === 'team') {
    const r = team(l, html, title); note = r.people;
    content = OPEN + code(r.a) + text(booking(l)) + code(bar(l,bookTarget)) + CLOSE;
  } else if (kind === 'contact') {
    const a = STYLE() + `<div class="lx">${hero(l, t.ctEb, title, t.ctSub, UP+POOL[7], title)}</div>`;
    const fid = formIds[0];
    const ct = `<div class="lx"><section class="sec"><div class="w ct"><div><span class="eb">${t.ctEb}</span><h2>${l==='fr'?'Adresse, heures et stationnement':'Address, hours and parking'}</h2><dl>${t.dl.map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl><div class="cta" style="margin-top:28px;display:flex;flex-wrap:wrap;gap:12px"><a class="b b1" href="${MAPS}" target="_blank" rel="noopener">${t.route}${AR}</a></div></div><div class="lxf lxg" id="rdv"><h2>${t.ctH}</h2><p class="sub">${t.ctSub}</p>[contact-form-7 id="${fid}"]</div><div class="mapw" style="grid-column:2;height:clamp(320px,26vw,440px)"><iframe src="${MAPEMBED}" title="${t.mapT}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div></div></section></div>`;
    const b = bar(l,bookTarget);
    content = OPEN + code(a) + text(ct) + code(b) + CLOSE;
    note = 'form ' + fid;
  } else if (kind === 'legal') {
    const a = STYLE() + `<div class="lx">${hero(l, EB[l].legal, title, '', null)}</div>`;
    const sc = (raw.match(/\[wpcode[^\]]*\]/)||[raw])[0];
    content = OPEN + code(a) + text(`<div class="lx"><section class="sec"><div class="w"><div class="prose legal">${sc}</div></div></section></div>`,'lx-bkw lx-legal') + text(booking(l)) + code(bar(l,bookTarget)) + CLOSE;
  } else if (kind === 'blog') {
    const a = STYLE() + `<div class="lx">${hero(l, EB[l].blog, title, '', null)}</div>`;
    content = OPEN + code(a) + CLOSE + raw + OPEN + text(booking(l)) + code(bar(l,bookTarget)) + CLOSE;
  } else {
    const blocks = extract(html);
    const s = sectionize(blocks, title);
    if (s.secs.length && !s.secs.some(x=>x.imgs.length)) { let best=0; s.secs.forEach((x,k)=>{ if (tlen(x)>tlen(s.secs[best])) best=k; }); if (tlen(s.secs[best])>200) s.secs[best].imgs.push({src:UP+POOL[(idx*3+4)%POOL.length],alt:''}); }
    let a = STYLE() + `<div class="lx">${hero(l, eb, s.h1, s.lead, pic, title)}${renderSecs(s.secs, false)}`;
    if (kind === 'service') {
      const others = window.__P.filter(p => p.l===l && p.id!==pg.id);
      const off = others.length ? (pg.id % others.length) : 0;
      const pick = [0,1,2,3].map(k => others[(off+k*3)%others.length]).filter((v,k,arr)=>v && arr.indexOf(v)===k);
      a += `<section class="sec wash"><div class="w"><div class="head"><div><span class="eb">${EB[l].service}</span><h2>${t.rel}</h2></div><a class="b b2" href="${t.allUrl}">${t.all}${AR}</a></div><div class="grid">${pick.map(p=>`<a class="card" href="${p.link}"><h3>${esc(new DOMParser().parseFromString(p.t,'text/html').body.textContent)}</h3><p></p><span class="t">${t.more}</span></a>`).join('')}</div></div></section>`;
    }
    if (/^(clinique-dentaire|dental-clinic)$/.test(pg.slug)) a += `<section class="sec wash"><div class="w"><div class="sh"><span class="eb">${EB[l].clinic}</span><h2>${l==='fr'?'Visitez nos installations':'Tour our clinic'}</h2></div><div class="gal" style="margin-top:0">${POOL.map(x=>`<div>${imgTag(UP+x,'')}</div>`).join('')}</div></div></section>`;
    a += facts(l) + `</div>`;
    const ownForm = formIds.find(f => f !== t.bookForm);
    const bkH = ownForm ? title : null;
    const bkP = ownForm ? (l==='fr'?'Remplissez le formulaire ci-contre.':'Fill in the form.') : null;
    content = OPEN + code(a) + text(booking(l, ownForm || null, bkH, bkP)) + code(bar(l,bookTarget)) + CLOSE;
    note = `${s.secs.length} sections, ${s.secs.reduce((n,x)=>n+x.imgs.length,0)} img` + (ownForm?`, form ${ownForm}`:'');
  }
  const slug = pg.slug + t.sfx;
  const H = {credentials:'include', headers:{'X-WP-Nonce':window.__NONCE,'Content-Type':'application/json'}};
  const ex = await (await fetch(`/wp-json/wp/v2/pages?slug=${encodeURIComponent(slug)}&status=draft&lang=${l}&_fields=id`, H)).json();
  const body = JSON.stringify({title:`${title} – ${t.draft}`, slug, status:'draft', template:'100-width.php', content});
  let r;
  if (Array.isArray(ex) && ex.length) r = await fetch(`/wp-json/wp/v2/pages/${ex[0].id}?lang=${l}`, {method:'POST', ...H, body});
  else r = await fetch(`/wp-json/wp/v2/pages?lang=${l}`, {method:'POST', ...H, body});
  const j = await r.json();
  return {id:j.id, status:r.status, slug, l, title, kind, note, url: ORIGIN + (l==='en'?'/en/':'/') + slug + '/'};
}


async function buildIndex(groups){
  const t = L.fr;
  const card = r => `<a class="card" href="${r.url}"><h3>${esc(r.title)}</h3><p>${r.l==='en'?'English':'Français'}</p><span class="t">Voir l’aperçu</span></a>`;
  const a = STYLE() + `<div class="lx">${hero('fr','Aperçu SSS','Toutes les pages du nouveau site','Chaque page de la Clinique dentaire La Cité, refaite dans le nouveau design. Brouillons visibles seulement lorsque vous êtes connecté à WordPress.',null)}` +
    groups.map((g,i)=>`<section class="sec${i%2?' wash':''}"><div class="w"><div class="sh"><span class="eb">${g.eb}</span><h2>${g.h}</h2></div><div class="grid">${g.items.map(card).join('')}</div></div></section>`).join('') + `</div>`;
  const content = OPEN + code(a) + CLOSE;
  const H = {credentials:'include', headers:{'X-WP-Nonce':window.__NONCE,'Content-Type':'application/json'}};
  const ex = await (await fetch(`/wp-json/wp/v2/pages?slug=apercu-sss&status=draft&lang=fr&_fields=id`, H)).json();
  const body = JSON.stringify({title:'Aperçu SSS – toutes les pages (brouillon)', slug:'apercu-sss', status:'draft', template:'100-width.php', content});
  const r = Array.isArray(ex)&&ex.length ? await fetch(`/wp-json/wp/v2/pages/${ex[0].id}?lang=fr`,{method:'POST',...H,body}) : await fetch(`/wp-json/wp/v2/pages?lang=fr`,{method:'POST',...H,body});
  return (await r.json()).id;
}
window.LCGEN = {build, buildIndex, extract, sectionize, L, POOL};
})();


/* ==========================================
   PTECH DIGITAL
   SMOOTH PORTAL LOGIN — V14
   LIGHT + DARK TRANSITION
========================================== */

/* ==========================================
   SUPABASE
========================================== */

const SUPABASE_URL =
    "https://agivwsbczzvvuzszcvxz.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

/* ==========================================
   ELEMENTS
========================================== */

const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginError = document.getElementById("loginError");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const capsLockWarning = document.getElementById("capsLockWarning");
const loginCard = document.querySelector(".login-card");

let isRedirecting = false;

/* ==========================================
   LOGIN HELPERS
========================================== */

function showLoginError(message) {
    if (!loginError) return;

    loginError.textContent = message;
    loginError.classList.add("show");
}

function clearLoginError() {
    if (!loginError) return;

    loginError.textContent = "";
    loginError.classList.remove("show");
}

function setLoginLoading(loading) {
    if (!loginButton) return;

    loginButton.disabled = loading;
    loginButton.textContent = loading
        ? "Prijava..."
        : "Prijavi se";
}

function shakeLoginCard() {
    if (!loginCard) return;

    loginCard.classList.remove("shake");
    void loginCard.offsetWidth;
    loginCard.classList.add("shake");
}

/* ==========================================
   CUSTOM PTECH LOADING BAR V13.8
   Replaces the old portal circle and spinner.
========================================== */
function startClientTransition() {
    if (isRedirecting) return;
    isRedirecting = true;
    if (loginButton) loginButton.disabled = true;

    if (window.PTechLoading?.navigate) {
        window.PTechLoading.navigate('form.html', {
            replace: true,
            label: 'Otvaramo vas portal...'
        });
    } else {
        window.location.replace('form.html');
    }
}

/* ==========================================
   SUPABASE LOGIN
========================================== */

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            if (isRedirecting) return;

            clearLoginError();

            const email =
                emailInput?.value.trim() || "";

            const password =
                passwordInput?.value || "";

            if (!email || !password) {

                showLoginError(
                    "Unesite e-mail adresu i lozinku."
                );

                return;
            }

            setLoginLoading(true);

            try {

                const { data, error } =
                    await supabaseClient.auth
                        .signInWithPassword({
                            email,
                            password
                        });

                if (error || !data?.user) {

                    showLoginError(
                        "E-mail adresa ili lozinka nisu točni."
                    );

                    shakeLoginCard();
                    return;
                }

                const {
                    data: profile,
                    error: profileError
                } = await supabaseClient
                    .from("profiles")
                    .select("id, display_name, role")
                    .eq("id", data.user.id)
                    .maybeSingle();

                if (profileError) {

                    console.error(
                        "Profile error:",
                        profileError
                    );

                    showLoginError(
                        "Prijava je uspjela, ali profil nije moguće učitati."
                    );

                    return;
                }

                if (!profile) {

                    showLoginError(
                        "Korisnički profil nije pronađen."
                    );

                    return;
                }

                localStorage.setItem(
                    "user",
                    data.user.email || email
                );

                const role = String(
                    profile.role || "client"
                ).trim().toLowerCase();

                if (role === "admin") {

                    isRedirecting = true;

                    if (window.PTechLoading?.navigate) {
                        window.PTechLoading.navigate('admin.html', {replace:true, label:'Otvaramo administraciju...'});
                    } else {
                        window.location.replace('admin.html');
                    }

                    return;
                }

                startClientTransition();

            } catch (error) {

                console.error(
                    "Login error:",
                    error
                );

                showLoginError(
                    "Došlo je do pogreške pri povezivanju. Pokušajte ponovno."
                );

            } finally {

                if (!isRedirecting) {
                    setLoginLoading(false);
                }
            }
        }
    );
}

/* ==========================================
   SHOW / HIDE PASSWORD
========================================== */

if (togglePassword && passwordInput) {

    togglePassword.addEventListener(
        "click",
        function () {

            const visible =
                passwordInput.type === "password";

            passwordInput.type =
                visible ? "text" : "password";

            togglePassword.setAttribute(
                "aria-label",
                visible
                    ? "Sakrij lozinku"
                    : "Prikaži lozinku"
            );

            togglePassword.setAttribute(
                "aria-pressed",
                String(visible)
            );

            passwordInput.focus();
        }
    );
}

/* ==========================================
   CAPS LOCK
========================================== */

if (passwordInput && capsLockWarning) {

    function checkCapsLock(event) {

        const isOn = Boolean(
            event.getModifierState &&
            event.getModifierState("CapsLock")
        );

        capsLockWarning.classList.toggle(
            "show",
            isOn
        );

        capsLockWarning.hidden = !isOn;
    }

    passwordInput.addEventListener(
        "keydown",
        checkCapsLock
    );

    passwordInput.addEventListener(
        "keyup",
        checkCapsLock
    );

    passwordInput.addEventListener(
        "blur",
        function () {

            capsLockWarning.classList.remove("show");
            capsLockWarning.hidden = true;
        }
    );
}

/* ==========================================
   PARTICLES — SAME AS LOGIN V13
========================================== */

function createParticles() {

    const container =
        document.getElementById("particles");

    if (!container) return;

    if (
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches
    ) {
        return;
    }

    container.replaceChildren();

    const count = 34;

    for (let i = 0; i < count; i++) {

        const particle =
            document.createElement("span");

        particle.className = "particle";

        const top =
            Math.random() * 96 + 2;

        const width =
            Math.random() * 65 + 30;

        const duration =
            Math.random() * 10 + 12;

        const delay =
            Math.random() * -22;

        const opacity =
            Math.random() * 0.35 + 0.3;

        particle.style.setProperty(
            "--particle-top",
            top + "%"
        );

        particle.style.setProperty(
            "--particle-width",
            width + "px"
        );

        particle.style.setProperty(
            "--particle-duration",
            duration + "s"
        );

        particle.style.setProperty(
            "--particle-delay",
            delay + "s"
        );

        particle.style.setProperty(
            "--particle-opacity",
            opacity
        );

        container.appendChild(particle);
    }
}

createParticles();

/* ==========================================
   PTECH SUPPORT BOT
========================================== */

const supportTrigger =
    document.getElementById("supportTrigger");

const supportPanel =
    document.getElementById("supportPanel");

const supportClose =
    document.getElementById("supportClose");

const supportMessages =
    document.getElementById("supportMessages");

const supportQuestionList =
    document.getElementById("supportQuestionList");

/* ==========================================
   SUPPORT QUESTIONS
========================================== */

const supportQuestions = [

    {
        question: "Kako se prijaviti?",

        answer:
            "Za prijavu unesite e-mail adresu i lozinku " +
            "koje vam je dodijelio PTech Digital. " +
            "Nakon uspješne prijave otvorit će se vaš portal."
    },

    {
        question: "Lozinka ili mail nisu točni",

        answer:
            "Provjerite jeste li ispravno upisali e-mail " +
            "adresu i lozinku. Obratite pozornost na " +
            "velika i mala slova te provjerite Caps Lock. " +
            "Ako prijava i dalje ne uspijeva, " +
            "kontaktirajte PTech Digital tim."
    },

    {
        question: "Nemam pristupne podatke",

        answer:
            "Pristupne podatke dodjeljuje PTech Digital. " +
            "Ako ih još niste dobili, javite se osobi " +
            "iz našeg tima s kojom ste dogovorili suradnju."
    }

];

/* ==========================================
   SUPPORT OPEN / CLOSE
========================================== */

function setSupportOpen(open) {

    if (!supportPanel || !supportTrigger) return;

    supportPanel.hidden = !open;

    supportTrigger.setAttribute(
        "aria-expanded",
        String(open)
    );
}

if (supportTrigger && supportPanel) {

    supportTrigger.addEventListener(
        "click",
        function () {

            setSupportOpen(
                supportPanel.hidden
            );

        }
    );
}

if (supportClose) {

    supportClose.addEventListener(
        "click",
        function () {

            setSupportOpen(false);

            supportTrigger?.focus();

        }
    );
}

document.addEventListener(
    "keydown",
    function (event) {

        if (event.key === "Escape") {
            setSupportOpen(false);
        }
    }
);

/* ==========================================
   SUPPORT MESSAGES
========================================== */

function addSupportMessage(text, type) {

    if (!supportMessages) return;

    const message =
        document.createElement("div");

    message.className =
        "support-message " + type;

    message.textContent = text;

    supportMessages.appendChild(message);

    supportMessages.scrollTop =
        supportMessages.scrollHeight;
}

/* ==========================================
   SUPPORT FAQ BUTTONS
========================================== */

function renderSupportQuestions() {

    if (!supportQuestionList) return;

    supportQuestionList.replaceChildren();

    supportQuestions.forEach(function (item) {

        const button =
            document.createElement("button");

        button.type = "button";
        button.className = "support-question";
        button.textContent = item.question;

        button.addEventListener(
            "click",
            function () {

                addSupportMessage(
                    item.question,
                    "user"
                );

                addSupportMessage(
                    item.answer,
                    "bot"
                );

            }
        );

        supportQuestionList.appendChild(button);
    });
}

/* ==========================================
   INITIAL SUPPORT MESSAGE
========================================== */

if (supportMessages) {

    addSupportMessage(
        "Pozdrav! 👋 Dobro došli u PTech Digital podršku. " +
        "Odaberite jedno od ponuđenih pitanja i rado ćemo vam pomoći.",
        "bot"
    );
}

renderSupportQuestions();

/* ==========================================
   END — PTECH DIGITAL LOGIN V14
========================================== */


/* ==========================================
   REQUEST ACCESS - PTECH V3.3
   Public form; never sends invites or admin keys.
   Before deploying: paste your PUBLIC Turnstile SITE key below.
========================================== */
(() => {
  "use strict";
  const SITE_KEY = "0x4AAAAAAFvB4KXJ2OhpfkCw"; // PUBLIC, not SECRET
  const ENDPOINT = "https://agivwsbczzvvuzszcvxz.supabase.co/functions/v1/ptech-registration-request";
  const $ = id => document.getElementById(id);
  const open = $("openAccessRequest"), overlay = $("accessRequestOverlay");
  const close = $("closeAccessRequest"), form = $("accessRequestForm");
  const email = $("accessRequestEmail"), message = $("accessRequestMessage");
  const submit = $("submitAccessRequest");
  if (!open || !overlay || !form || !email || !close) return;
  let busy=false, widgetId=null, previousFocus=null, approved=false;
  function say(text,error=false){ message.textContent=text;message.dataset.error=String(error); }
  function openModal(){
    previousFocus=document.activeElement;
    overlay.hidden=false;document.body.classList.add('v33-access-open');
    email.value=$("email")?.value?.trim()||"";say("");approved=false;
    submit.disabled=false;submit.textContent="Pošalji zahtjev";email.focus();
    if (SITE_KEY.startsWith('PASTE_')) {
      say('Obrazac još nije aktiviran. Administrator mora postaviti Turnstile ključ.',true);submit.disabled=true;
      return;
    }
    if (window.turnstile && widgetId===null) {
      widgetId=window.turnstile.render('#accessTurnstileWidget',{sitekey:SITE_KEY,action:'request-access',theme:'auto'});
    }
    if (window.turnstile && widgetId!==null) window.turnstile.reset(widgetId);
  }
  function closeModal(){if(busy)return;overlay.hidden=true;document.body.classList.remove('v33-access-open');previousFocus?.focus?.();}
  open.addEventListener('click',openModal);
  close.addEventListener('click',closeModal);
  overlay.addEventListener('click',e=>{if(e.target===overlay)closeModal();});
  overlay.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();closeModal();return;}
    if(e.key!=='Tab')return;
    const focusables=[...overlay.querySelectorAll('button:not([disabled]),input:not([disabled]),[tabindex="0"]')]
      .filter(el=>el.getClientRects().length);
    const first=focusables[0],last=focusables.at(-1);
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
  });
  form.addEventListener('submit',async e=>{
    e.preventDefault();if(busy||approved||!form.reportValidity())return;
    const token=window.turnstile&&widgetId!==null ? window.turnstile.getResponse(widgetId) : '';
    if(!token){say('Potvrdite sigurnosnu provjeru.',true);return;}
    busy=true;submit.disabled=true;submit.textContent='Slanje…';say('');
    try{
      const res=await fetch(ENDPOINT,{
        method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY},
        body:JSON.stringify({email:email.value.trim(),turnstileToken:token})
      });
      if(!res.ok)throw new Error('Delivery failed');
      approved=true;say('Zahtjev je zaprimljen. Ako ga odobrimo, pozivnica će stići na vašu e-mail adresu.');
      submit.textContent='Zahtjev je zaprimljen';
    }catch(err){say('Zahtjev nije poslan. Provjerite vezu ili pokušajte kasnije.',true);
      submit.disabled=false;submit.textContent='Pošalji zahtjev';
      if(window.turnstile&&widgetId!==null)window.turnstile.reset(widgetId);
    }finally{busy=false;}
  });
})();

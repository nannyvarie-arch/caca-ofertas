(function () {
  "use strict";

  var WHATSAPP = "5574999531947";

  var SERVICOS = {
    abertura: "Abertura de CNPJ",
    regularizacao: "Regularização de CNPJ",
    orientacao: "Orientação contábil",
    contratos: "Contratos e orientações",
    documentos: "Emissão de documentos",
    inss_obras: "INSS de obras",
    docs_obras: "Documentação para obras",
    outro: "Outro assunto"
  };

  // Rótulos usados no resumo e na mensagem de WhatsApp
  var ROTULOS = {
    ab_tipo: "Modelo",
    ab_atividade: "Atividade",
    ab_local: "Local",
    ab_socio: "Sócio",
    reg_cnpj: "CNPJ",
    reg_tipo: "Tipo de empresa",
    reg_pendencias: "Pendências",
    oc_tipo: "Tipo de empresa",
    oc_atividade: "Ramo",
    oc_nota: "Emite nota",
    oc_funcionarios: "Funcionários",
    ct_tipo: "Contrato",
    ct_partes: "Partes",
    doc_tipo: "Documentos",
    doc_frequencia: "Frequência",
    ob_tipo: "Tipo de obra",
    ob_area: "Área (m²)",
    ob_responsavel: "Em nome de",
    ob_fase: "Fase",
    ob_cno: "Possui CNO",
    do_necessidade: "Precisa de",
    do_cidade: "Cidade da obra",
    mensagem: "Mensagem",
    urgencia: "Prazo",
    nome: "Nome",
    whatsapp: "WhatsApp",
    email: "E-mail",
    cidade: "Cidade",
    horario: "Melhor horário"
  };

  /* ---------- Ano no rodapé ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---------- Header: sombra ao rolar ---------- */
  var header = document.querySelector(".header");
  var onScroll = function () {
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Menu mobile ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("menu");
  var closeMenu = function () {
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Abrir menu");
  };
  toggle.addEventListener("click", function () {
    var open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
  });
  nav.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", closeMenu);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeMenu();
  });

  /* ---------- Link ativo no menu ---------- */
  var links = Array.prototype.slice.call(document.querySelectorAll(".nav__link"));
  if ("IntersectionObserver" in window) {
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          links.forEach(function (l) {
            l.classList.toggle("is-active", l.getAttribute("href") === "#" + entry.target.id);
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    links.forEach(function (l) {
      var target = document.querySelector(l.getAttribute("href"));
      if (target) spy.observe(target);
    });

    /* ---------- Revelar ao rolar ---------- */
    var revealer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    document.querySelectorAll(".reveal").forEach(function (el) {
      revealer.observe(el);
    });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* ---------- FAQ: abre um por vez ---------- */
  var faqItems = document.querySelectorAll(".faq__item");
  faqItems.forEach(function (item) {
    item.addEventListener("toggle", function () {
      if (!item.open) return;
      faqItems.forEach(function (other) {
        if (other !== item) other.open = false;
      });
    });
  });

  /* ==========================================================
     Formulário em etapas
     ========================================================== */
  var form = document.getElementById("lead-form");
  if (!form) return;

  var steps = form.querySelectorAll(".form-step");
  var progress = form.querySelectorAll("[data-progress]");
  var groups = form.querySelectorAll(".service-fields");
  var serviceTitle = form.querySelector("[data-service-title]");
  var msgOpt = form.querySelector("[data-msg-opt]");
  var alertBox = form.querySelector("[data-form-alert]");
  var current = 1;

  function selectedService() {
    var checked = form.querySelector('input[name="servico"]:checked');
    return checked ? checked.value : "";
  }

  // Mostra só o grupo do serviço escolhido; os demais ficam desativados
  // para não serem validados nem enviados.
  function syncServiceFields() {
    var svc = selectedService();
    groups.forEach(function (g) {
      var active = g.getAttribute("data-for") === svc;
      g.hidden = !active;
      g.querySelectorAll("input, select, textarea").forEach(function (el) {
        el.disabled = !active;
      });
    });
    serviceTitle.textContent = SERVICOS[svc] ? SERVICOS[svc] : "Detalhes do serviço";
    msgOpt.hidden = svc === "outro";
    form.elements.servico_nome.value = SERVICOS[svc] || "";
  }

  function showStep(n, focus) {
    current = n;
    steps.forEach(function (s) {
      s.hidden = Number(s.getAttribute("data-step")) !== n;
    });
    progress.forEach(function (p) {
      var i = Number(p.getAttribute("data-progress"));
      p.classList.toggle("is-active", i === n);
      p.classList.toggle("is-done", i < n);
    });
    if (focus) {
      var card = form.closest(".form-card");
      var top = card.getBoundingClientRect().top + window.scrollY - 100;
      if (card.getBoundingClientRect().top < 80) window.scrollTo({ top: top, behavior: "smooth" });
      var first = steps[n - 1].querySelector("input:not([type=hidden]):not(:disabled), select, textarea");
      if (first) first.focus({ preventScroll: true });
    }
  }

  function setError(field, on) {
    if (field) field.classList.toggle("has-error", on);
    return !on;
  }

  function onlyDigits(v) {
    return (v || "").replace(/\D/g, "");
  }

  function validateStep(n) {
    var ok = true;
    var step = steps[n - 1];

    if (n === 1) {
      ok = setError(step.querySelector('[data-field="servico"]'), !selectedService());
    }

    if (n === 2) {
      var svc = selectedService();
      var group = form.querySelector('.service-fields[data-for="' + svc + '"]');
      if (group) {
        group.querySelectorAll("[data-field]").forEach(function (field) {
          var inputs = field.querySelectorAll("input, select, textarea");
          var valid;
          if (inputs[0] && (inputs[0].type === "radio" || inputs[0].type === "checkbox")) {
            valid = Array.prototype.some.call(inputs, function (i) {
              return i.checked;
            });
          } else {
            valid = !inputs[0] || !inputs[0].required || inputs[0].value.trim() !== "";
          }
          if (!setError(field, !valid)) ok = false;
        });
      }
      var msg = form.elements.mensagem;
      if (svc === "outro" && !setError(msg.closest(".field"), msg.value.trim().length < 5)) ok = false;
      else if (svc !== "outro") setError(msg.closest(".field"), false);
    }

    if (n === 3) {
      var nome = form.elements.nome;
      var wa = form.elements.whatsapp;
      var email = form.elements.email;
      var consent = form.elements.consentimento;
      if (!setError(nome.closest(".field"), nome.value.trim().length < 3)) ok = false;
      var digits = onlyDigits(wa.value);
      if (!setError(wa.closest(".field"), digits.length < 10 || digits.length > 11)) ok = false;
      var emailBad = email.value.trim() !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
      if (!setError(email.closest(".field"), emailBad)) ok = false;
      if (!setError(consent.closest(".field"), !consent.checked)) ok = false;
    }

    if (!ok) {
      var firstErr = step.querySelector(".has-error input, .has-error select, .has-error textarea");
      if (firstErr) firstErr.focus();
    }
    return ok;
  }

  form.addEventListener("click", function (e) {
    var next = e.target.closest("[data-next]");
    var prev = e.target.closest("[data-prev]");
    if (next && validateStep(current)) showStep(current + 1, true);
    if (prev) showStep(current - 1, true);
  });

  // Limpa o erro assim que a pessoa corrige
  form.addEventListener("input", function (e) {
    var field = e.target.closest(".has-error");
    if (field) field.classList.remove("has-error");
  });
  form.addEventListener("change", function (e) {
    if (e.target.name === "servico") {
      syncServiceFields();
      setError(form.querySelector('[data-field="servico"]'), false);
    }
    var field = e.target.closest(".has-error");
    if (field) field.classList.remove("has-error");
  });

  // Enter avança de etapa em vez de enviar o formulário cedo demais
  form.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA" && current < 3) {
      e.preventDefault();
      if (validateStep(current)) showStep(current + 1, true);
    }
  });

  /* ---------- Máscaras ---------- */
  form.querySelectorAll("[data-mask]").forEach(function (input) {
    input.addEventListener("input", function () {
      var d = onlyDigits(input.value);
      if (input.getAttribute("data-mask") === "phone") {
        d = d.slice(0, 11);
        if (d.length > 6) input.value = "(" + d.slice(0, 2) + ") " + d.slice(2, d.length - 4) + "-" + d.slice(-4);
        else if (d.length > 2) input.value = "(" + d.slice(0, 2) + ") " + d.slice(2);
        else input.value = d;
      } else {
        d = d.slice(0, 14);
        var out = d.slice(0, 2);
        if (d.length > 2) out += "." + d.slice(2, 5);
        if (d.length > 5) out += "." + d.slice(5, 8);
        if (d.length > 8) out += "/" + d.slice(8, 12);
        if (d.length > 12) out += "-" + d.slice(12);
        input.value = out;
      }
    });
  });

  /* ---------- Pré-seleção a partir dos cards de serviço ---------- */
  function preselect(svc) {
    var radio = form.querySelector('input[name="servico"][value="' + svc + '"]');
    if (!radio) return;
    radio.checked = true;
    syncServiceFields();
    showStep(2, false);
  }
  document.querySelectorAll("[data-servico]").forEach(function (link) {
    link.addEventListener("click", function () {
      preselect(link.getAttribute("data-servico"));
    });
  });
  var param = new URLSearchParams(window.location.search).get("servico");
  if (param) preselect(param);

  /* ---------- Coleta, resumo e envio ---------- */
  function collect() {
    var data = new FormData(form);
    var merged = {};
    data.forEach(function (value, key) {
      value = String(value).trim();
      if (!value) return;
      merged[key] = merged[key] ? merged[key] + ", " + value : value;
    });
    return merged;
  }

  function whatsappMessage(d) {
    var lines = ["Olá, Mizayana! Acabei de enviar uma solicitação pelo site.", ""];
    lines.push("*Serviço:* " + (SERVICOS[d.servico] || "-"));
    Object.keys(ROTULOS).forEach(function (k) {
      if (d[k] && ["nome", "whatsapp", "email", "cidade", "horario"].indexOf(k) === -1) {
        lines.push("*" + ROTULOS[k] + ":* " + d[k]);
      }
    });
    lines.push("");
    lines.push("*Nome:* " + d.nome);
    if (d.cidade) lines.push("*Cidade:* " + d.cidade);
    if (d.horario) lines.push("*Melhor horário:* " + d.horario);
    return lines.join("\n");
  }

  function renderSummary(d) {
    var dl = document.querySelector("[data-summary]");
    dl.innerHTML = "";
    var rows = [["Serviço", SERVICOS[d.servico]]];
    Object.keys(ROTULOS).forEach(function (k) {
      if (d[k]) rows.push([ROTULOS[k], d[k]]);
    });
    rows.forEach(function (r) {
      var wrap = document.createElement("div");
      var dt = document.createElement("dt");
      var dd = document.createElement("dd");
      dt.textContent = r[0];
      dd.textContent = r[1];
      wrap.appendChild(dt);
      wrap.appendChild(dd);
      dl.appendChild(wrap);
    });
  }

  function encode(obj) {
    return Object.keys(obj)
      .map(function (k) {
        return encodeURIComponent(k) + "=" + encodeURIComponent(obj[k]);
      })
      .join("&");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validateStep(3)) return;

    var d = collect();
    if (d.website) return; // bot

    var submitBtn = form.querySelector("[data-submit]");
    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando…";
    alertBox.hidden = true;

    var waUrl = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(whatsappMessage(d));

    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: encode(d)
    })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        var success = document.querySelector("[data-success]");
        success.querySelector("[data-success-name]").textContent = d.nome.split(" ")[0];
        success.querySelector("[data-success-wa]").href = waUrl;
        renderSummary(d);
        form.hidden = true;
        success.hidden = false;
        success.focus({ preventScroll: true });
        window.scrollTo({ top: success.getBoundingClientRect().top + window.scrollY - 120, behavior: "smooth" });
      })
      .catch(function () {
        alertBox.innerHTML = "";
        alertBox.appendChild(
          document.createTextNode("Não conseguimos registrar o envio agora. Envie sua solicitação direto pelo WhatsApp: ")
        );
        var a = document.createElement("a");
        a.href = waUrl;
        a.target = "_blank";
        a.rel = "noopener";
        a.style.fontWeight = "700";
        a.style.textDecoration = "underline";
        a.textContent = "abrir WhatsApp com o resumo";
        alertBox.appendChild(a);
        alertBox.hidden = false;
      })
      .then(function () {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Enviar solicitação <svg class="icon"><use href="#i-arrow"/></svg>';
      });
  });

  syncServiceFields();
  showStep(1, false);
})();

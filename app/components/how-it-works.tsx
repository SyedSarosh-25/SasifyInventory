'use client';

import React from 'react';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { favicon } from '../product-utils';

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="how-it-works-section" aria-labelledby="how-it-works-title">
      <div className="section-inner">
        {/* Section Header */}
        <div className="how-it-works-header">
          <div className="hiw-kicker">
            <span className="hiw-kicker-dot" aria-hidden="true" />
            01 // HOW IT WORKS
          </div>
          <h2 id="how-it-works-title">
            Simple, Transparent 4-Step Process
          </h2>
          <p>
            Direct official subscriptions in Pakistan. Real provider platform logins with instant local PKR checkout.
          </p>
        </div>

        {/* 100% Genuine Guarantee Banner */}
        <div className="hiw-guarantee-banner">
          <div className="hiw-guarantee-left">
            <div className="hiw-shield-emblem" aria-hidden="true">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="hiw-guarantee-tagline">
                <span className="hiw-guarantee-pill">100% OFFICIAL GUARANTEE</span>
                <span className="hiw-guarantee-sub">• Direct Provider Infrastructure</span>
              </div>
              <h3 className="hiw-guarantee-title">
                No 3rd-Party Panels. No Cookie Extensions. Asli Subscriptions.
              </h3>
              <p className="hiw-guarantee-desc">
                Sasify eliminates shady browser extensions and cracked mirrors. You receive genuine official platform access with confirmed replacement warranty.
              </p>
            </div>
          </div>

          <div className="hiw-guarantee-badges">
            <span className="hiw-badge-red">
              <span aria-hidden="true">✕</span> No Shady Extensions
            </span>
            <span className="hiw-badge-blue">
              <Check className="h-3.5 w-3.5" aria-hidden="true" /> Direct Official Logins
            </span>
          </div>
        </div>

        {/* 4 Steps Grid */}
        <div className="hiw-grid">
          {/* STEP 1: Choose Official Plan */}
          <article className="hiw-card">
            <div>
              <div className="hiw-card-top">
                <span className="hiw-step-num hiw-step-blue">01</span>
                <span className="hiw-card-badge hiw-badge-blue-subtle">100% ORIGINAL</span>
              </div>
              <h3 className="hiw-card-title">Choose Official Plan</h3>
              <p className="hiw-card-text">
                Browse 1,000+ verified tools. Har account official provider domain par login hota hai — koi third-party cracked panel nahi.
              </p>
            </div>

            <div className="hiw-card-bottom">
              <span className="hiw-bottom-label">Official Platforms</span>
              <div className="hiw-logos-row">
                <span className="hiw-logo-box" title="ChatGPT / OpenAI">
                  <img src={favicon('openai.com')} alt="ChatGPT" width={22} height={22} loading="lazy" decoding="async" />
                </span>
                <span className="hiw-logo-box" title="Claude / Anthropic">
                  <img src={favicon('anthropic.com')} alt="Claude" width={22} height={22} loading="lazy" decoding="async" />
                </span>
                <span className="hiw-logo-box" title="Canva">
                  <img src={favicon('canva.com')} alt="Canva" width={22} height={22} loading="lazy" decoding="async" />
                </span>
                <span className="hiw-logo-box" title="Cursor">
                  <img src={favicon('cursor.com')} alt="Cursor" width={22} height={22} loading="lazy" decoding="async" />
                </span>
              </div>
            </div>
          </article>

          {/* STEP 2: Pay Locally in PKR */}
          <article className="hiw-card">
            <div>
              <div className="hiw-card-top">
                <span className="hiw-step-num hiw-step-purple">02</span>
                <span className="hiw-card-badge hiw-badge-purple-subtle">DIRECT PKR</span>
              </div>
              <h3 className="hiw-card-title">Pay Locally in PKR</h3>
              <p className="hiw-card-text">
                Foreign card decline aur extra withholding taxes se chutkara. Easypaisa, SadaPay, NayaPay, Raast, Banks ya Binance se direct payment.
              </p>
            </div>

            <div className="hiw-card-bottom">
              <span className="hiw-bottom-label">Accepted Payment Rails</span>
              <div className="hiw-logos-row">
                <span className="hiw-logo-box hiw-logo-pill" title="Easypaisa">
                  <img src="/payment-methods/easypaisa.webp" alt="Easypaisa" width={56} height={20} loading="lazy" decoding="async" />
                </span>
                <span className="hiw-logo-box hiw-logo-pill" title="SadaPay">
                  <img src="/payment-methods/sadapay.webp" alt="SadaPay" width={56} height={20} loading="lazy" decoding="async" />
                </span>
                <span className="hiw-logo-box" title="Binance Pay">
                  <img src="/payment-methods/binance.svg" alt="Binance Pay" width={22} height={22} loading="lazy" decoding="async" />
                </span>
              </div>
            </div>
          </article>

          {/* STEP 3: Auto Verification & Delivery */}
          <article className="hiw-card">
            <div>
              <div className="hiw-card-top">
                <span className="hiw-step-num hiw-step-emerald">03</span>
                <span className="hiw-card-badge hiw-badge-emerald-subtle">100% AUTOMATED</span>
              </div>
              <h3 className="hiw-card-title">Auto Verification & Delivery</h3>
              <p className="hiw-card-text">
                Automatic payment verification aur instant credential delivery. Zero human involvement or manual admin approval needed — system verifies and delivers official logins in ~30s!
              </p>
            </div>

            <div className="hiw-card-bottom">
              <div className="hiw-status-box hiw-status-emerald">
                <div className="hiw-status-inner">
                  <span className="hiw-live-pulse" aria-hidden="true" />
                  <strong>Zero Human Wait</strong>
                </div>
                <span className="hiw-speed-tag">⚡ ~30s Auto</span>
              </div>
            </div>
          </article>

          {/* STEP 4: Warranty & Priority Support */}
          <article className="hiw-card">
            <div>
              <div className="hiw-card-top">
                <span className="hiw-step-num hiw-step-green">04</span>
                <span className="hiw-card-badge hiw-badge-green-subtle">24/7 SUPPORT</span>
              </div>
              <h3 className="hiw-card-title">Warranty & WhatsApp</h3>
              <p className="hiw-card-text">
                Har plan ke sath confirmed replacement warranty hoti hai. Instant activation help ke liye hamari team WhatsApp par 24/7 mojood hai.
              </p>
            </div>

            <div className="hiw-card-bottom">
              <div className="hiw-status-box hiw-status-whatsapp">
                <div className="hiw-status-inner">
                  <svg className="h-4 w-4 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.888 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <strong>Official WhatsApp</strong>
                </div>
                <span className="hiw-online-tag">ONLINE</span>
              </div>
            </div>
          </article>
        </div>

        {/* Footer Browse Banner */}
        <div className="hiw-browse-footer">
          <div className="hiw-browse-text">
            <strong>Ready to start?</strong>
            <span>Explore 1,000+ verified subscriptions with instant digital activation.</span>
          </div>
          <a href="#catalog" className="primary-button hiw-action-btn">
            Browse verified catalog <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}

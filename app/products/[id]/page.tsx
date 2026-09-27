
import { LocalizedContent } from '../../components/language';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ExternalLink,
  MessageCircle,
  ShieldCheck,
  ShoppingCart,
  Tag,
} from 'lucide-react';
import { products } from '../../products';
import {
  productAbout,
  supplierProductAbout,
} from '../../product-about';
import { ProductLogo } from '../../components/product-logo';
import { StockBuy } from '../../components/checkout';
import { SupplierLivePurchase } from '../../components/supplier-live-purchase';
import { SiteFooter, SiteHeader } from '../../components/site-chrome';
import { Money, OriginalPrice } from '../../components/currency';
import { StructuredData } from '../../components/structured-data';
import {
  breadcrumbData,
  productData,
  productDescription,
  productQuestions,
  productTitle,
  supplierProductData,
  supplierProductDescription,
  supplierProductQuestions,
  supplierProductTitle,
} from '../../seo';
import {
  findSupplierSeoProduct,
  supplierProductHref,
  supplierSeoProducts,
  type SupplierSeoProduct,
} from '../../supplier-seo';
import { supplierLogo, supplierMonogram } from '../../supplier-product-utils';
import {
  accessTypeLabel,
  isAnnualPlan,
  originalPriceComparison,
  originalPricePkr,
  productHref,
  savingsPkr,
  siteOrigin,
  warrantyDays,
  whatsappLink,
} from '../../product-utils';
import { productShareImage, productShareImageUrl } from '../../share-metadata';
import { supplierOriginalPriceComparison, supplierSavingsPkr } from '../../supplier-price-utils';
import { productSearchTags } from '../../product-search-tags';

type Props = { params: Promise<{ id: string }> };

function findLocalProduct(routeId: string) {
  return products.find((item) => item.slug === routeId || item.id === routeId);
}

function PurchaseDisclaimer() {
  return (
    <LocalizedContent><aside className="purchase-disclaimer" role="note">
      <strong>Please read before purchasing</strong>
      <p>
        Please read the complete product description, activation requirements,
        duration and warranty terms before payment. If an issue arises because
        the description or requirements were not read or followed, Sasify
        Solutions cannot be held responsible.
      </p>
    </aside></LocalizedContent>
  );
}

function usefulCases(name: string, cases: string[]) {
  if (/chatgpt/i.test(name)) return [
    'Draft, rewrite and summarize writing or documents.',
    'Explain code, debug errors and work on software projects with Codex, subject to the plan’s usage limits.',
    'Generate and refine images, ideas and presentations.',
    'Explore research questions, study topics and everyday planning.',
  ];
  if (/figma/i.test(name)) return [
    'Design website and app screens, wireframes and interactive prototypes.',
    'Collaborate on interface designs and hand off assets to developers.',
  ];
  const useful = cases.filter((item) => !/before purchase|confirm|check|review|choose this type/i.test(item)).slice(0, 3);
  return useful.length ? useful : [`Use ${name} for the functions described in this listing.`];
}

function ProductUseCases({ name, slug, cases }: { name: string; slug: string; cases: string[] }) {
  const searches = productSearchTags(name, slug);
  return <section className="description-section product-use-cases" id="popular-uses">
    <h2>Popular uses</h2>
    <ul className="supplier-description-list">{usefulCases(name, cases).map((item) => <li key={item}>{item}</li>)}</ul>
    {searches.length ? <div className="product-related-searches">
      <h3>Related searches</h3>
      <ul aria-label="Related product searches" className="product-search-tags">
        {searches.map((phrase) => <li key={phrase} data-no-translate>{phrase}</li>)}
      </ul>
    </div> : null}
  </section>;
}

export function generateStaticParams() {
  return [
    ...products.map((product) => ({ id: product.slug || product.id })),
    ...supplierSeoProducts.map((product) => ({ id: product.slug })),
  ];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = findLocalProduct(id);
  if (!product) {
    const supplierProduct = findSupplierSeoProduct(id);
    if (supplierProduct) {
      const title = supplierProductTitle(supplierProduct);
      const description = supplierProductDescription(supplierProduct);
      return {
        title,
        description,
        alternates: {
          canonical: `${siteOrigin}${supplierProductHref(supplierProduct)}`,
        },
        openGraph: {
          title,
          description,
          url: `${siteOrigin}${supplierProductHref(supplierProduct)}`,
          images: productShareImage(id, title),
        },
        twitter: { card: 'summary_large_image', title, description, images: [productShareImageUrl(id)] },
      };
    }
    return {
      title: 'Product not found | Sasify Solutions',
      robots: { index: false },
    };
  }
  const title = productTitle(product);
  const description = productDescription(product);
  return {
    title,
    description,
    alternates: { canonical: `${siteOrigin}${productHref(product)}` },
    openGraph: {
      title,
      description,
      url: `${siteOrigin}${productHref(product)}`,
      images: productShareImage(id, title),
    },
    twitter: { card: 'summary_large_image', title, description, images: [productShareImageUrl(id)] },
  };
}

function SupplierSeoProductPage({ product }: { product: SupplierSeoProduct }) {
  const questions = supplierProductQuestions(product);
  const about = supplierProductAbout(product);
  const logo = supplierLogo(product.name, product.logoUrl);
  const comparison = supplierOriginalPriceComparison(product);
  const savings = supplierSavingsPkr(product);
  const descriptionBlocks = product.description
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  const descriptionContent = descriptionBlocks.map((block, blockIndex) => {
    const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const isHeading = lines.length === 1 && lines[0].endsWith(':');
    const isList = lines.length > 1 && lines.every((line) => /^[•*-]\s+/.test(line));
    if (isHeading)
      return <h3 className="supplier-description-heading" key={`${block}-${blockIndex}`}>{lines[0].slice(0, -1)}</h3>;
    if (isList)
      return (
        <ul className="supplier-description-list" key={`${block}-${blockIndex}`}>
          {lines.map((line) => <li key={line}>{line.replace(/^[•*-]\s+/, '')}</li>)}
        </ul>
      );
    return (
      <p key={`${block}-${blockIndex}`}>
        {lines.map((line, lineIndex) => (
          <span key={line}>{lineIndex ? <br /> : null}{line}</span>
        ))}
      </p>
    );
  });
  return (
    <LocalizedContent><main>
      <SiteHeader />
      <StructuredData data={supplierProductData(product)} />
      <StructuredData
        data={breadcrumbData([
          { name: 'Home', path: '/' },
          { name: 'Full inventory', path: '/inventory' },
          { name: product.name, path: supplierProductHref(product) },
        ])}
      />
      <div className="detail-shell supplier-detail-shell">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <a href="/">Home</a>
          <span aria-hidden="true">/</span>
          <a href="/inventory">Full inventory</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{product.name}</span>
        </nav>
        <a href="/inventory" className="back-link">
          <ArrowLeft className="h-4 w-4" /> All products
        </a>
        <div className="detail-layout">
          <article className="detail-content">
            <div className="detail-identity product-detail-hero">
              <div className="detail-logo-frame supplier-detail-logo">
                {logo ? (
                  <img src={logo} alt={`${product.name} logo`} />
                ) : (
                  <span aria-label={`${product.name} logo`}>
                    {supplierMonogram(product.name)}
                  </span>
                )}
              </div>
              <div>
                <span className="section-kicker">{product.category}</span>
                <h1>{product.name}</h1>
                <span className="detail-duration">
                  <CalendarDays className="h-4 w-4" /> Instant delivery
                </span>
                <p className="detail-hero-summary">Review the product requirements and availability before ordering.</p>
                <a className="detail-hero-action" href="#purchase-options">See price &amp; purchase options <ArrowRight className="h-4 w-4" /></a>
              </div>
            </div>
            <nav className="detail-jump-links" aria-label="Product sections">
              <a href="#overview">Overview</a>
              <a href="#questions">Questions about this product</a>
              <a href="#popular-uses">Popular uses</a>
            </nav>

            <section className="description-section" id="overview">
              <h2>Product description</h2>
              {descriptionBlocks.length ? descriptionContent : (
                <p>
                  {product.name} is available through Sasify Solutions with
                  automatic delivery after payment verification.
                </p>
              )}
              {product.deliveryInstruction ? (
                <p>
                  <strong>Activation note:</strong>{' '}
                  {product.deliveryInstruction}
                </p>
              ) : null}
              <dl className="package-facts">
                <div>
                  <dt>Package</dt>
                  <dd>{product.name}</dd>
                </div>
                <div>
                  <dt>Category</dt>
                  <dd>{product.category}</dd>
                </div>
                <div>
                  <dt>Availability</dt>
                  <dd>{product.available.toLocaleString('en-PK')} in stock</dd>
                </div>
                <div>
                  <dt>Supplier route</dt>
                  <dd>{product.providerName || 'Automated supplier'}</dd>
                </div>
              </dl>
              {product.requiresCustomerEmail ? (
                <p>
                  <strong>Customer email required.</strong> This supplier needs
                  your email during checkout to process or deliver the product.
                </p>
              ) : null}
            </section>

            <section className="description-section" id="questions">
              <h2>Questions about this product</h2>
              <div className="faq-list">
                {questions.map(({ question, answer }, index) => (
                  <details key={question} open={index === 0}>
                    <summary>{question}</summary>
                    <p>{answer}</p>
                  </details>
                ))}
              </div>
            </section>
            <ProductUseCases name={product.name} slug={product.slug} cases={about.useCases} />
          </article>

          <aside
            className="purchase-summary"
            aria-label="Product pricing and purchase"
          >
            <span className="section-kicker">Ready to order</span>
            <div className="purchase-heading">
              <h2>{product.name}</h2>
            </div>
            <dl className="detail-prices">
              <div>
                <dt>Original price</dt>
                <dd>{comparison ? <Money amount={comparison.totalPkr} /> : 'Price may vary'}</dd>
              </div>
              <div className="selling-price">
                <dt>
                  <Tag className="h-4 w-4" /> Our price
                </dt>
                <dd>
                  <Money amount={product.price} />
                </dd>
              </div>
              <div>
                <dt>Your savings</dt>
                <dd>{savings !== null ? <Money amount={savings} /> : 'Price may vary'}</dd>
              </div>
              <div>
                <dt>Availability</dt>
                <dd>{product.available.toLocaleString('en-PK')} in stock</dd>
              </div>
              <div>
                <dt>Delivery</dt>
                <dd>Automatic after payment verification</dd>
              </div>
            </dl>
            <div className="plan-notice">
              <ShieldCheck className="h-5 w-5" />
              <span>
                <strong>Listing-specific terms</strong>
                Review the product requirements before payment.
              </span>
            </div>
            <PurchaseDisclaimer />
            <div id="purchase-options" className="detail-purchase-actions">
              <SupplierLivePurchase
                productId={product.id}
                canonicalKey={product.canonicalKey}
                name={product.name}
              />
            </div>
            <p className="order-footnote">
              WhatsApp support is available after successful payment.
            </p>
            <button
              type="button"
              className="whatsapp-purchase detail-buy"
              disabled
            >
              <MessageCircle className="h-5 w-5" /> WhatsApp support{' '}
              <span>(after payment)</span>
            </button>
          </aside>
        </div>
      </div>
      <SiteFooter />
    </main></LocalizedContent>
  );
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const product = findLocalProduct(id);
  if (!product) {
    const supplierProduct = findSupplierSeoProduct(id);
    if (supplierProduct) return <LocalizedContent><SupplierSeoProductPage product={supplierProduct} /></LocalizedContent>;
    notFound();
  }
  if (id === product.id && product.slug && product.slug !== product.id)
    redirect(productHref(product));
  const annual = isAnnualPlan(product);
  const sharedChatGpt = product.id === 'p093-shared';
  const appleWarrantyDays = warrantyDays(product, 'p093-ultra') ?? 30;
  const savings = savingsPkr(product);
  const original = originalPricePkr(product);
  const comparison = originalPriceComparison(product);
  const questions = productQuestions(product);
  const about = productAbout(product);
  const related = products
    .filter((item) => item.id !== id && item.category === product.category)
    .sort(
      (a, b) =>
        Number(b.name.split(' ')[0] === product.name.split(' ')[0]) -
        Number(a.name.split(' ')[0] === product.name.split(' ')[0]),
    )
    .slice(0, 3);

  return (
    <LocalizedContent><main>
      <SiteHeader />
      <StructuredData data={productData(product)} />
      <StructuredData
        data={breadcrumbData([
          { name: 'Home', path: '/' },
          { name: 'Full inventory', path: '/inventory' },
          { name: product.name, path: productHref(product) },
        ])}
      />
      <div className="detail-shell">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <a href="/">Home</a>
          <span aria-hidden="true">/</span>
          <a href="/inventory">Full inventory</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{product.name}</span>
        </nav>
        <a href="/inventory" className="back-link">
          <ArrowLeft className="h-4 w-4" /> All products
        </a>
        <div className="detail-layout">
          <article className="detail-content">
            <div className="detail-identity product-detail-hero">
              <div className="detail-logo-frame">
                <ProductLogo product={product} eager />
              </div>
              <div>
                <span className="section-kicker">{product.category}</span>
                <h1>{product.name}</h1>
                <span className="detail-duration">
                  <CalendarDays className="h-4 w-4" />{' '}
                  {product.duration === '-'
                    ? 'Duration confirmed at checkout'
                    : product.duration}
                </span>
                <p className="detail-hero-summary">{product.description}</p>
                <a className="detail-hero-action" href="#purchase-options">See price &amp; purchase options <ArrowRight className="h-4 w-4" /></a>
              </div>
            </div>
            <nav className="detail-jump-links" aria-label="Product sections">
              <a href="#overview">Overview</a>
              {product.variants?.length && product.id !== 'p093' ? <a href="#account-options">Choose your VPS package</a> : null}
              <a href="#questions">Questions about this plan</a>
              <a href="#popular-uses">Popular uses</a>
            </nav>

            <section className="description-section" id="overview">
              <h2>Full description</h2>
              <p>{product.description}</p>
              {product.details?.map((detail) => (
                <p key={detail}>{detail}</p>
              ))}
              <dl className="package-facts">
                <div>
                  <dt>Package</dt>
                  <dd>{product.name}</dd>
                </div>
                <div>
                  <dt>Access type</dt>
                  <dd>{product.id === 'p093' ? 'Private plan' : sharedChatGpt ? 'Shared plan' : accessTypeLabel(product)}</dd>
                </div>
                <div>
                  <dt>Access period / allocation</dt>
                  <dd>
                    {product.duration === '-' ? 'See package options below' : product.duration}
                  </dd>
                </div>
                <div>
                  <dt>Order support</dt>
                  <dd>Sasify Solutions on WhatsApp</dd>
                </div>
              </dl>
              {sharedChatGpt ? <p className="shared-account-disclaimer"><strong>Shared-account terms.</strong> Up to four customers use this account. Your data and activity are not private and may be visible to others. Usage is shared, so no individual usage-limit guarantee is provided. After delivery, shared access is not eligible for replacement, warranty or refund if the shared allowance is reached. The email and password are delivered after payment; a one-time 2FA code is shown once on the original checkout device. The authenticator secret is never shared.</p> : null}
            </section>

            {product.variants?.length && product.id !== 'p093' ? (
              <section id="account-options" className="description-section">
                <h2>
                  {product.id === 'p093'
                    ? 'Choose your ChatGPT Plus account'
                    : 'Choose your VPS package'}
                </h2>
                <p>
                  {product.id === 'p093'
                    ? 'Select the account stability and payment tier that suits you.'
                    : 'Online checkout is not available for Hostinger VPS. Select a KVM package below and purchase on WhatsApp. All options include 12-month validity, dedicated resources, NVMe storage, high-speed bandwidth and full VPS access and control.'}
                </p>
                <div className="vps-variant-grid">
                  {product.variants.map((variant) => {
                    const card = (
                      <>
                        <div className="vps-variant-heading">
                          <div>
                            <span className="section-kicker">
                              {product.id === 'p093'
                                ? variant.name.includes('Apple Pay')
                                  ? 'Ultra stable'
                                  : 'Value option'
                                : 'Hostinger VPS'}
                            </span>
                            <h3>{variant.name}</h3>
                          </div>
                          <span className="vps-variant-duration">
                            {variant.duration}
                          </span>
                        </div>
                        <dl className="vps-variant-prices">
                          <div>
                            <dt>Official price</dt>
                            <dd>
                              <Money amount={variant.originalPricePkr} />
                            </dd>
                          </div>
                          <div>
                            <dt>Sasify price</dt>
                            <dd>
                              <Money amount={variant.sellingPricePkr} />
                            </dd>
                          </div>
                        </dl>
                        <p className="vps-variant-saving">
                          Save{' '}
                          <strong>
                            <Money
                              amount={
                                variant.originalPricePkr -
                                variant.sellingPricePkr
                              }
                            />
                          </strong>
                        </p>
                      </>
                    );
                    return product.id === 'p093' && variant.id ? (
                      <article className="vps-variant-card" key={variant.name}>
                        {card}
                      </article>
                    ) : (
                      <article className="vps-variant-card" key={variant.name}>
                        {card}
                        <a
                          href={whatsappLink(
                            `${product.name} ${variant.name}`,
                            variant.duration,
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="primary-button vps-variant-buy"
                        >
                          <MessageCircle className="h-4 w-4" /> Purchase on
                          WhatsApp
                        </a>
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : null}

            <section className="description-section" id="questions">
              <h2>Questions about this plan</h2>
              <div className="faq-list">
                {questions.map(({ question, answer }, index) => (
                  <details key={question} open={index === 0}>
                    <summary>{question}</summary>
                    <p>{answer}</p>
                  </details>
                ))}
              </div>
            </section>
            <ProductUseCases name={product.name} slug={product.slug || product.id} cases={about.useCases} />
          </article>

          <aside
            className="purchase-summary"
            aria-label="Product pricing and purchase"
          >
            <span className="section-kicker">Your selected plan</span>
            <div className="purchase-heading">
              <h2>{product.name}</h2>
            </div>
            {product.id === 'p093' && (
              <p className="selected-option-name">
                Ultra Stable Account · Apple Pay
              </p>
            )}
            <dl className="detail-prices">
              <div>
                <dt>
                  {product.contactOnly
                    ? 'Pricing'
                    : `Original Pricing ${comparison && comparison.period !== 'package' ? '(full plan)' : ''}`}
                </dt>
                <dd>
                  {product.contactOnly ? (
                    'Contact on WhatsApp'
                  ) : original === null ? (
                    <OriginalPrice reference={product.originalPrice} />
                  ) : (
                    <Money amount={original} />
                  )}
                </dd>
              </div>
              <div className="selling-price">
                <dt>{product.contactOnly ? 'Full details' : 'Our Pricing'}</dt>
                <dd>
                  {product.contactOnly ? (
                    'Contact on WhatsApp'
                  ) : (
                    <Money amount={product.sellingPricePkr} />
                  )}
                </dd>
              </div>
              <div className="savings-price">
                <dt>{product.contactOnly ? 'Packages' : 'Your Savings'}</dt>
                <dd>
                  {product.contactOnly ? (
                    `${product.variants?.length ?? 0} KVM options`
                  ) : savings === null ? (
                    'Price or duration unavailable'
                  ) : (
                    <Money amount={savings} />
                  )}
                </dd>
              </div>
            </dl>
            {product.contactOnly ? (
              <p className="price-explanation">
                Choose a KVM package above, then contact us on WhatsApp for
                availability, payment and activation details.
              </p>
            ) : product.id === 'p093' ? (
              <div className="price-explanation">
                <p>
                  Selected option: <strong>Apple Pay · Ultra Stable</strong>
                </p>
                <p>Use Pay online here to continue. Pay from your Sasify Wallet to receive 5% off this purchase.</p>
              </div>
            ) : savings === null ? (
              <p className="price-explanation">
                A numeric provider reference and plan duration are not available for this comparison.
              </p>
            ) : (
              <div className="price-explanation">
                {comparison && (
                  <p>
                    <Money amount={comparison.unitAmountPkr} />
                    {comparison.period !== 'package' && (
                      <>
                        {' '}
                        &times; {comparison.quantity} {comparison.period}
                        {comparison.quantity === 1 ? '' : 's'}
                      </>
                    )}{' '}
                    &minus; <Money amount={product.sellingPricePkr} /> ={' '}
                    <strong>
                      <Money amount={savings} />
                    </strong>
                  </p>
                )}
                <p>
                  Reference: <OriginalPrice reference={product.originalPrice} />
                  . Monthly rates are multiplied by the plan&apos;s months;
                  annual-only rates use the plan&apos;s years. Access and
                  provider billing options may differ.
                </p>
              </div>
            )}
            {product.sourceUrl && (
              <a
                href={product.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="price-source"
              >
                Provider pricing reference{' '}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            {annual && (
              <div className="plan-notice">
                <CalendarDays className="h-5 w-5" />
                <span>
                  <strong>One-time payment for the full year</strong>No monthly
                  payments to Sasify Solutions.
                </span>
              </div>
            )}
            <div className="plan-notice">
              <ShieldCheck className="h-5 w-5" />
              <span>
                <strong>
                  {sharedChatGpt ? 'Shared access · no warranty' : product.id === 'p093' ? (
                    `Full ${appleWarrantyDays}-day warranty`
                  ) : 'Listing-specific warranty'}
                </strong>
                {sharedChatGpt ? (
                  ' No replacement or refund after delivery or when shared usage is exhausted.'
                ) : product.id === 'p093' ? (
                  'Included with this Apple Pay plan.'
                ) : (
                  ' Review this product’s stated warranty terms before payment.'
                )}
              </span>
            </div>
            <PurchaseDisclaimer />
            <div id="purchase-options" className="detail-purchase-actions">
              {!product.contactOnly && (
                <StockBuy
                  productId={product.id === 'p093' ? 'p093-ultra' : product.id}
                />
              )}
              {product.contactOnly ? (
                <a
                  href={whatsappLink(product.name, product.duration)}
                  target="_blank"
                  rel="noreferrer"
                  className="primary-button detail-buy"
                >
                  <MessageCircle className="h-5 w-5" /> Contact on WhatsApp
                </a>
              ) : product.id === 'p093' ? (
                <a
                  href="/checkout?product=p093-ultra"
                  className="primary-button detail-buy"
                >
                  <ShoppingCart className="h-5 w-5" /> Buy online
                </a>
              ) : (
                <a
                  href={`/checkout?product=${encodeURIComponent(product.id)}`}
                  className="primary-button detail-buy"
                >
                  <ShoppingCart className="h-5 w-5" /> Buy online
                </a>
              )}
            </div>
            {!product.contactOnly && (
              <>
                <p className="order-footnote">Review the access and activation details above, then complete checkout online.</p>
                <button
                  type="button"
                  className="whatsapp-purchase detail-buy"
                  disabled
                >
                  <MessageCircle className="h-5 w-5" /> WhatsApp support{' '}
                  <span>(after payment)</span>
                </button>
              </>
            )}
          </aside>
        </div>

        {related.length > 0 && (
          <section className="related-section">
            <h2>More plans to explore</h2>
            <div className="related-grid">
              {related.map((item) => (
                <a
                  key={item.id}
                  href={productHref(item)}
                  className="related-product"
                >
                  <div className="product-logo-frame">
                    <ProductLogo product={item} />
                  </div>
                  <div>
                    <h3>{item.name}</h3>
                    <p>{item.duration}</p>
                    <strong>
                      {item.contactOnly ? (
                        'Contact on WhatsApp'
                      ) : (
                        <Money amount={item.sellingPricePkr} />
                      )}
                    </strong>
                  </div>
                  <ArrowRight className="h-4 w-4" />
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
      <SiteFooter />
    </main></LocalizedContent>
  );
}

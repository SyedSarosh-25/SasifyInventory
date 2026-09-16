import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ExternalLink,
  MessageCircle,
  ShieldCheck,
  ShoppingCart,
  Tag,
} from 'lucide-react';
import { products } from '../../products';
import { ProductLogo } from '../../components/product-logo';
import { StockBuy } from '../../components/checkout';
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
  productLogo,
  savingsPkr,
  siteOrigin,
  warrantyDays,
  whatsappLink,
} from '../../product-utils';

type Props = { params: Promise<{ id: string }> };

function findLocalProduct(routeId: string) {
  return products.find((item) => item.slug === routeId || item.id === routeId);
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
      const logo = supplierLogo(supplierProduct.name, supplierProduct.logoUrl);
      const images = logo ? [{ url: logo, alt: supplierProduct.name }] : [];
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
          images,
        },
        twitter: { card: 'summary', title, description, images },
      };
    }
    return {
      title: 'Product not found | Sasify Solutions',
      robots: { index: false },
    };
  }
  const title = productTitle(product);
  const description = productDescription(product);
  const logo = productLogo(product);
  const images = logo ? [{ url: logo, alt: product.name }] : [];
  return {
    title,
    description,
    alternates: { canonical: `${siteOrigin}${productHref(product)}` },
    openGraph: {
      title,
      description,
      url: `${siteOrigin}${productHref(product)}`,
      images,
    },
    twitter: { card: 'summary', title, description, images },
  };
}

function SupplierSeoProductPage({ product }: { product: SupplierSeoProduct }) {
  const questions = supplierProductQuestions(product);
  const logo = supplierLogo(product.name, product.logoUrl);
  const descriptionBlocks = product.description
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  return (
    <main>
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
            <div className="detail-identity">
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
              </div>
            </div>

            <section className="description-section">
              <h2>Product description</h2>
              {descriptionBlocks.length ? (
                descriptionBlocks.map((block) => <p key={block}>{block}</p>)
              ) : (
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
                <div>
                  <dt>Listing reference</dt>
                  <dd>{product.id}</dd>
                </div>
              </dl>
            </section>

            <section className="description-section">
              <h2>Payment &amp; delivery</h2>
              <p>
                The listed Sasify price is{' '}
                <strong>
                  <Money amount={product.price} />
                </strong>
                . Pay online through secure checkout and keep the order page
                open while payment is verified.
              </p>
              <p>
                <strong>Warranty terms are listing-specific.</strong> Review the
                product description and activation requirements before payment,
                then use the WhatsApp support button shown with your order if
                you need help.
              </p>
              {product.requiresCustomerEmail ? (
                <p>
                  <strong>Customer email required.</strong> This supplier needs
                  your email during checkout to process or deliver the product.
                </p>
              ) : null}
            </section>

            <section className="description-section">
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
          </article>

          <aside
            className="purchase-summary"
            aria-label="Product pricing and purchase"
          >
            <span className="section-kicker">Ready to order</span>
            <div className="purchase-heading">
              <div className="product-logo-frame supplier-detail-logo">
                {logo ? (
                  <img src={logo} alt={`${product.name} logo`} />
                ) : (
                  <span aria-label={`${product.name} logo`}>
                    {supplierMonogram(product.name)}
                  </span>
                )}
              </div>
              <h2>{product.name}</h2>
            </div>
            <dl className="detail-prices">
              <div className="selling-price">
                <dt>
                  <Tag className="h-4 w-4" /> Our price
                </dt>
                <dd>
                  <Money amount={product.price} />
                </dd>
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
            <a
              href={`/checkout?product=${encodeURIComponent(product.id)}`}
              className="primary-button detail-buy"
            >
              <ShoppingCart className="h-5 w-5" /> Buy online
            </a>
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
    </main>
  );
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const product = findLocalProduct(id);
  if (!product) {
    const supplierProduct = findSupplierSeoProduct(id);
    if (supplierProduct) return <SupplierSeoProductPage product={supplierProduct} />;
    notFound();
  }
  if (id === product.id && product.slug && product.slug !== product.id)
    redirect(productHref(product));
  const annual = isAnnualPlan(product);
  const sharedChatGpt = product.id === 'p093-shared';
  const appleWarrantyDays = warrantyDays(product, 'p093-ultra') ?? 25;
  const savings = savingsPkr(product);
  const original = originalPricePkr(product);
  const comparison = originalPriceComparison(product);
  const questions = productQuestions(product);
  const related = products
    .filter((item) => item.id !== id && item.category === product.category)
    .sort(
      (a, b) =>
        Number(b.name.split(' ')[0] === product.name.split(' ')[0]) -
        Number(a.name.split(' ')[0] === product.name.split(' ')[0]),
    )
    .slice(0, 3);

  return (
    <main>
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
            <div className="detail-identity">
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
              </div>
            </div>

            <section className="description-section">
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
                  <dd>{accessTypeLabel(product)}</dd>
                </div>
                <div>
                  <dt>Access period / allocation</dt>
                  <dd>
                    {product.duration === '-'
                      ? 'Confirm before purchase'
                      : product.duration}
                  </dd>
                </div>
                <div>
                  <dt>Order support</dt>
                  <dd>Sasify Solutions on WhatsApp</dd>
                </div>
                <div>
                  <dt>Listing reference</dt>
                  <dd>{product.id}</dd>
                </div>
              </dl>
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
                    : 'Select a KVM package below. All options include 12-month validity, dedicated resources, NVMe storage, high-speed bandwidth and full VPS access and control.'}
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

            <section className="description-section">
              <h2>Payment &amp; warranty</h2>
              {product.contactOnly ? (
                <p>
                  <strong>
                    Online checkout is not available for Hostinger VPS.
                  </strong>{' '}
                  Choose your KVM package above and purchase directly through
                  WhatsApp. Our team will confirm availability, payment details
                  and activation.
                </p>
              ) : annual ? (
                <p>
                  <strong>
                    Pay <Money amount={product.sellingPricePkr} /> once for the
                    full year.
                  </strong>{' '}
                  This is a one-time payment to Sasify Solutions. No monthly
                  payments to us are needed during your one-year plan.
                </p>
              ) : (
                <p>
                  The listed Sasify price is{' '}
                  <strong>
                    <Money amount={product.sellingPricePkr} />
                  </strong>{' '}
                  for this package. Confirm the access period, activation
                  requirements and payment details with our team before
                  ordering.
                </p>
              )}
              {sharedChatGpt ? (
                <p className="shared-account-disclaimer">
                  <strong>Shared-account terms.</strong> This ChatGPT Plus
                  account is shared by up to four customers. Your data and
                  activity are not private and may be visible to other members.
                  After payment, the email and password are delivered and one
                  2FA login code is shown once on the original checkout device;
                  the authenticator secret is never shared.
                  Usage is shared, so no individual usage-limit guarantee is
                  provided. After delivery, this shared access is not eligible
                  for replacement, warranty or refund if the shared allowance
                  is reached.
                </p>
              ) : product.id === 'p093' ? (
                <>
                  <p className="chatgpt-ultra-only">
                    <strong>Full {appleWarrantyDays}-day warranty included.</strong> This
                    Apple Pay / Ultra Stable one-month product comes with a
                    full {appleWarrantyDays}-day warranty from Sasify Solutions. Use the
                    WhatsApp support button shown with your order if you need
                    help.
                  </p>
                </>
              ) : (
                <p>
                  <strong>Warranty terms are listing-specific.</strong> Review the
                  warranty shown for this product before payment, then use the
                  WhatsApp support button shown with your order if you need help.
                </p>
              )}
            </section>

            <section className="description-section">
              <h2>Before you order</h2>
              <ul className="order-checks">
                <li>
                  <Check className="h-4 w-4" /> Confirm the exact edition,
                  access type and availability with our team.
                </li>
                <li>
                  <Check className="h-4 w-4" /> Review any account, device or
                  invitation requirements before payment.
                </li>
                <li>
                  <Check className="h-4 w-4" /> Provider feature and usage
                  limits still apply to the selected plan.
                </li>
              </ul>
            </section>
            <section className="description-section">
              <h2>Questions about this plan</h2>
              <div className="faq-list">
                {questions.map(({ question, answer }, index) => (
                  <details key={question} open={index === 0}>
                    <summary>{question}</summary>
                    <p>{answer}</p>
                  </details>
                ))}
              </div>
              <p>
                <a href="/buying-guide">Compare plans and access types</a>, read
                the <a href="/warranty">warranty policy</a> and{' '}
                <a href="/refunds">refund policy</a>, or{' '}
                <a href="/about">learn about Sasify Solutions</a> before
                ordering.
              </p>
            </section>
          </article>

          <aside
            className="purchase-summary"
            aria-label="Product pricing and purchase"
          >
            <span className="section-kicker">Your selected plan</span>
            <div className="purchase-heading">
              <div className="product-logo-frame">
                <ProductLogo product={product} eager />
              </div>
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
                <p>Use Pay online here to continue.</p>
              </div>
            ) : savings === null ? (
              <p className="price-explanation">
                A numeric original price and a confirmed plan duration are
                needed to calculate savings. Ask our team for the current
                provider reference.
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
                <ShoppingCart className="h-5 w-5" /> Pay online · PKR 3,499
              </a>
            ) : (
              <a
                href={`/checkout?product=${encodeURIComponent(product.id)}`}
                className="primary-button detail-buy"
              >
                <ShoppingCart className="h-5 w-5" /> Buy online
              </a>
            )}
            {!product.contactOnly && (
              <>
                <p className="order-footnote">
                  Availability and activation details are confirmed before
                  payment.
                </p>
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
    </main>
  );
}

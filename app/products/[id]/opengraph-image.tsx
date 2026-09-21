import { ImageResponse } from 'next/og';
import { products } from '../../products';
import { formatPkr } from '../../product-utils';
import { findSupplierSeoProduct } from '../../supplier-seo';
import { supplierMonogram } from '../../supplier-product-utils';
import { sasifyLogoDataUriValue } from '../../share-logo';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type Props = { params: Promise<{ id: string }> };

function findLocalProduct(routeId: string) {
  return products.find((product) => product.slug === routeId || product.id === routeId);
}

export default async function Image({ params }: Props) {
  const { id } = await params;
  const localProduct = findLocalProduct(id);
  const supplierProduct = localProduct ? null : findSupplierSeoProduct(id);
  const name = localProduct?.name || supplierProduct?.name || 'Digital product';
  const category = localProduct?.category || supplierProduct?.category || 'Digital tools and subscriptions';
  const price = localProduct
    ? formatPkr(localProduct.sellingPricePkr)
    : supplierProduct
      ? formatPkr(supplierProduct.price)
      : 'Shop online in Pakistan';
  const nameFontSize = name.length > 55 ? 42 : name.length > 38 ? 50 : 58;
  const monogram = supplierMonogram(name);

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '52px 72px 42px',
        color: '#09102a',
        background: 'linear-gradient(135deg, #f8fbff 0%, #eef3ff 58%, #e7ddff 100%)',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: '#285cff', fontSize: 23, fontWeight: 800, letterSpacing: 2 }}>
          <img
            src={String(sasifyLogoDataUriValue)}
            alt="Sasify Solutions logo"
            width={46}
            height={46}
            style={{ display: 'flex', width: 46, height: 46, borderRadius: 14, backgroundColor: '#fff' }}
          />
          SASIFY SOLUTIONS
        </div>
        <div style={{ display: 'flex', padding: '11px 18px', borderRadius: 999, color: '#08795f', background: '#d9f8ee', fontSize: 21, fontWeight: 700 }}>Instant delivery</div>
      </div>
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 62, padding: '34px 0 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 18 }}>
          <div style={{ color: '#285cff', fontSize: 22, fontWeight: 800, letterSpacing: 2 }}>{category.toUpperCase()}</div>
          <div style={{ fontSize: nameFontSize, lineHeight: 1.08, fontWeight: 800 }}>{name}</div>
          <div style={{ color: '#50617f', fontSize: 29, lineHeight: 1.25 }}>Buy online in Pakistan with automated delivery after payment verification.</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 8 }}>
            <div style={{ color: '#50617f', fontSize: 22 }}>Our price</div>
            <div style={{ color: '#285cff', fontSize: 40, fontWeight: 800 }}>{price}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 300, height: 300, borderRadius: 38, background: '#fff', border: '2px solid #c9d8ff', boxShadow: '0 20px 50px rgba(47, 73, 148, .15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 176, height: 176, borderRadius: 28, color: '#fff', background: 'linear-gradient(135deg, #285cff, #7541f5)', fontSize: 72, fontWeight: 800 }}>{monogram}</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#50617f', fontSize: 22, fontWeight: 700 }}>
        <div>Search · Select · Pay · Get credentials</div>
        <div>AI tools · Subscriptions · Services</div>
      </div>
    </div>,
    size,
  );
}

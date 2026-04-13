import React from 'react';
import { MarketplaceItem } from '../../../core/types';

interface ProductShareTemplateProps {
  product: MarketplaceItem;
}

export const ProductShareTemplate: React.FC<ProductShareTemplateProps> = ({ product }) => {
  return (
    <div 
      id="share-template"
      style={{
        width: '1200px',
        height: '630px',
        background: '#000',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        padding: '40px',
        fontFamily: 'sans-serif',
        position: 'relative'
      }}
    >
      <div style={{ display: 'flex', gap: '40px', flex: 1 }}>
        <img 
          src={product.images?.[0] || 'https://picsum.photos/seed/product/400/500'} 
          alt={product.title}
          style={{ width: '500px', height: '100%', objectFit: 'cover', borderRadius: '20px' }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '20px' }}>
          <h1 style={{ fontSize: '60px', margin: 0 }}>{product.title}</h1>
          <p style={{ fontSize: '30px', color: '#aaa' }}>{product.description}</p>
          <span style={{ fontSize: '50px', color: '#ffcc00', fontWeight: 'bold' }}>{product.price} {product.currency || 'SAR'}</span>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: '40px', right: '40px', fontSize: '20px', color: '#666' }}>
        Powered by Souq Connect
      </div>
    </div>
  );
};

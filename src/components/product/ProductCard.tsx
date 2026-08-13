'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, Tag, Button, Typography, Space, message, Avatar, Tooltip } from 'antd';
import { 
  ShoppingCartOutlined, 
  MessageOutlined, 
  HeartOutlined, 
  HeartFilled, 
  UserOutlined, 
  ShopOutlined 
} from '@ant-design/icons';
import { addToCart, getUser, sendDirectMessage, toggleWishlist, isWishlisted } from '../../lib/store';

const { Title, Text } = Typography;

function formatPrice(price: number) {
  const num = Number(price);
  if (isNaN(num) || num < 0) return 'Rp0';
  return 'Rp' + Math.floor(num).toLocaleString('id-ID');
}

export default function ProductCard({ product }: { product: any }) {
  const [messageApi, contextHolder] = message.useMessage();
  const [favored, setFavored] = useState(false);
  const isOutOfStock = (product.stock !== undefined && product.stock <= 0) || product.status === 'sold';

  useEffect(() => {
    setFavored(isWishlisted(product.id));
  }, [product.id]);

  function handleToggleWishlist(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    const added = toggleWishlist(product.id);
    setFavored(added);
    if (added) {
      messageApi.success('Disimpan ke Favorit!');
    } else {
      messageApi.info('Dihapus dari Favorit.');
    }
  }

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    const user = getUser();
    if (!user) {
      window.location.href = '/login';
      return;
    }
    if (user.email === product.sellerEmail) {
      messageApi.warning('Tidak bisa membeli produk sendiri.');
      return;
    }
    if (isOutOfStock) {
      messageApi.error('Maaf, stok habis.');
      return;
    }
    addToCart(product);
    messageApi.success('Berhasil ditambah ke keranjang!');
  }

  function handleStartChat(e: React.MouseEvent) {
    e.preventDefault();
    const user = getUser();
    if (!user) {
      window.location.href = '/login';
      return;
    }
    if (user.email === product.sellerEmail) {
      messageApi.warning('Ini produk kamu sendiri.');
      return;
    }

    sendDirectMessage({
      sellerEmail: product.sellerEmail,
      sellerName: product.seller,
      buyerEmail: user.email,
      buyerName: user.name,
      productId: product.id,
      productName: product.name,
      productPrice: product.price,
      proposedPrice: null,
      messageText: `Halo ${product.seller}, saya berminat dengan produk ${product.name}.`,
      type: 'inquiry',
      status: 'chat',
    });

    window.dispatchEvent(new CustomEvent('open-direct-chat'));
  }

  const coverImg = (product.images && product.images.length > 0) ? product.images[0] : product.image;

  return (
    <div className="neo-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', opacity: isOutOfStock ? 0.85 : 1 }}>
      {contextHolder}

      {/* Image Container */}
      <Link href={`/product?id=${product.id}`}>
        <div style={{ height: 'clamp(140px, 30vw, 190px)', background: '#f4f4f0', borderBottom: '3px solid #000000', position: 'relative', overflow: 'hidden' }}>
          {/* Wishlist Button */}
          <button
            onClick={handleToggleWishlist}
            aria-label="Wishlist"
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              zIndex: 10,
              background: '#ffffff',
              border: '2px solid #000000',
              boxShadow: '2px 2px 0px #000000',
              borderRadius: 8,
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            {favored ? <HeartFilled style={{ color: '#ff2a85', fontSize: 14 }} /> : <HeartOutlined style={{ color: '#000000', fontSize: 14 }} />}
          </button>

          {/* Condition Tag */}
          <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, maxWidth: '60%' }}>
            {isOutOfStock ? (
              <span className="neo-tag" style={{ background: '#ff2a85', color: '#ffffff', fontSize: 10, padding: '1px 6px' }}>❌ HABIS</span>
            ) : (
              <span className="neo-tag" style={{ background: '#00f0ff', fontSize: 10, padding: '1px 6px' }}>{product.condition || 'Like New'}</span>
            )}
          </div>

          {coverImg ? (
            <img
              src={coverImg}
              alt={product.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#000000' }}>
              <ShopOutlined style={{ fontSize: 28, marginBottom: 2 }} />
              <Text strong style={{ fontSize: 10 }}>TANPA FOTO</Text>
            </div>
          )}
        </div>
      </Link>

      {/* Content Area */}
      <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#ffffff' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 4 }}>
            <span className="neo-tag" style={{ background: '#ffe600', fontSize: 9, padding: '1px 6px' }}>{product.category}</span>
            {product.allowNego !== false && (
              <span className="neo-tag" style={{ background: '#00e676', fontSize: 9, padding: '1px 6px' }}>NEGO</span>
            )}
          </div>

          <Link href={`/product?id=${product.id}`}>
            <Title
              level={5}
              style={{
                margin: '4px 0 6px 0',
                fontWeight: 900,
                fontSize: 'clamp(12px, 2.5vw, 14px)',
                lineHeight: 1.3,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                minHeight: 34,
                color: '#000000',
                fontFamily: 'Syne, sans-serif'
              }}
            >
              {product.name}
            </Title>
          </Link>

          {/* Price Display */}
          <div style={{ margin: '6px 0 10px 0' }}>
            <span style={{
              background: '#000000',
              color: '#ffe600',
              fontFamily: 'Syne, sans-serif',
              fontWeight: 900,
              fontSize: 'clamp(12px, 2.8vw, 15px)',
              padding: '3px 8px',
              borderRadius: 6,
              display: 'inline-block',
              border: '2px solid #000000',
              boxShadow: '2px 2px 0px #ff2a85',
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {formatPrice(product.price)}
            </span>
          </div>
        </div>

        <div>
          {/* Seller Tag */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 6px',
            borderRadius: 6,
            background: '#faf9f6',
            border: '2px solid #000000',
            marginBottom: 8
          }}>
            <Avatar size={18} style={{ backgroundColor: '#ff2a85', color: '#ffffff', fontWeight: 900, fontSize: 9 }} icon={<UserOutlined />}>
              {product.seller ? product.seller.charAt(0).toUpperCase() : 'U'}
            </Avatar>
            <div style={{ minWidth: 0, flex: 1 }}>
              <Text strong ellipsis style={{ fontSize: 10, display: 'block', lineHeight: 1.2, color: '#000000' }}>
                {product.seller}
              </Text>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={handleStartChat}
              style={{
                flex: 1,
                background: '#ffffff',
                border: '2px solid #000000',
                boxShadow: '2px 2px 0px #000000',
                borderRadius: 8,
                fontWeight: 900,
                fontSize: 10,
                padding: '6px 0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2
              }}
            >
              <MessageOutlined style={{ fontSize: 11 }} /> Chat
            </button>

            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              style={{
                flex: 1.3,
                background: isOutOfStock ? '#ccc' : '#ffe600',
                border: '2px solid #000000',
                boxShadow: isOutOfStock ? 'none' : '2px 2px 0px #000000',
                borderRadius: 8,
                fontWeight: 900,
                fontSize: 10,
                padding: '6px 0',
                cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2
              }}
            >
              <ShoppingCartOutlined style={{ fontSize: 11 }} /> Beli!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

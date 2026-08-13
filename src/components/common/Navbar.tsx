'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Input, Badge, Button, Dropdown, Avatar, Tooltip, notification } from 'antd';
import {
  ShoppingCartOutlined,
  UserOutlined,
  PlusCircleOutlined,
  LogoutOutlined,
  ShopOutlined,
  MessageOutlined,
  HomeOutlined,
  SearchOutlined,
  HistoryOutlined,
  ThunderboltOutlined,
  FireOutlined,
  SmileOutlined
} from '@ant-design/icons';
import { getUser, getCart, removeUser, getDirectMessages, syncWithServer, speakVoice, playOrderSound } from '../../lib/store';
import DirectChatDrawer from '../chat/DirectChatDrawer';

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [cartCount, setCartCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [directDrawerOpen, setDirectDrawerOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  function refreshState() {
    const u = getUser();
    setUser(u);
    const cart = getCart();
    setCartCount(cart.reduce((acc, i) => acc + i.qty, 0));
    if (u) {
      const msgs = getDirectMessages();
      const unread = msgs.filter(m => {
        if (m.deleted) return false;
        if (m.sellerEmail === u.email && m.deletedBySeller) return false;
        if (m.buyerEmail === u.email && m.deletedByBuyer) return false;
        return (m.sellerEmail === u.email && m.unreadBySeller) || (m.buyerEmail === u.email && m.unreadByBuyer);
      }).length;
      setUnreadCount(unread);
    }
  }

  useEffect(() => {
    refreshState();
    const interval = setInterval(() => {
      syncWithServer().then(() => refreshState());
    }, 3000);

    function handleOpenDirectChat() { setDirectDrawerOpen(true); }
    function handleCartUpdated() {
      const cart = getCart();
      setCartCount(cart.reduce((acc, i) => acc + i.qty, 0));
    }
    function handleMessagesUpdated() { refreshState(); }
    function handleNewIncomingMessage() {
      playOrderSound();
      speakVoice('Ada pesan masuk!');
      refreshState();
      
      notification.info({
        message: '⚡ PESAN BARU MASUK!',
        description: 'Ada transaksi / obrolan baru di PresUMart.',
        placement: 'topRight',
        onClick: () => { setDirectDrawerOpen(true); },
        duration: 5,
      });
    }

    window.addEventListener('open-direct-chat', handleOpenDirectChat);
    window.addEventListener('cart-updated', handleCartUpdated);
    window.addEventListener('messages-updated', handleMessagesUpdated);
    window.addEventListener('new-incoming-message', handleNewIncomingMessage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('open-direct-chat', handleOpenDirectChat);
      window.removeEventListener('cart-updated', handleCartUpdated);
      window.removeEventListener('messages-updated', handleMessagesUpdated);
      window.removeEventListener('new-incoming-message', handleNewIncomingMessage);
    };
  }, [user]);

  function handleLogout() {
    removeUser();
    refreshState();
    router.push('/');
  }

  function handleSearch(value: string) {
    if (value.trim()) {
      router.push(`/?search=${encodeURIComponent(value.trim())}`);
    } else {
      router.push('/');
    }
  }

  const userMenuItems = [
    {
      key: 'profile',
      label: (
        <Link href="/profile" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontWeight: 800 }}>
          <UserOutlined style={{ color: '#ff2a85' }} />
          <span>PROFIL SAYA</span>
        </Link>
      ),
    },
    {
      key: 'orders',
      label: (
        <Link href="/profile" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontWeight: 800 }}>
          <HistoryOutlined style={{ color: '#2563eb' }} />
          <span>RIWAYAT PESANAN</span>
        </Link>
      ),
    },
    {
      key: 'sell',
      label: (
        <Link href="/sell" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontWeight: 800 }}>
          <ShopOutlined style={{ color: '#00e676' }} />
          <span>KELOLA JUALANKU</span>
        </Link>
      ),
    },
    { type: 'divider' },
    {
      key: 'logout',
      label: (
        <div onClick={handleLogout} style={{ color: '#ff2a85', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontWeight: 800, cursor: 'pointer' }}>
          <LogoutOutlined />
          <span>KELUAR AKUN</span>
        </div>
      ),
    },
  ];

  return (
    <>
      {/* Neobrutalist Marquee Header */}
      <div className="ticker-wrap-neo">
        <div className="ticker-move-neo">
          <span className="ticker-item-neo"><FireOutlined /> MARKETPLACE KAMPUS PRESIDENT UNIVERSITY</span>
          <span className="ticker-item-neo">⚡ COD BEBAS ONGKIR IN CAMPUS</span>
          <span className="ticker-item-neo">★ 0% BIAYA ADMIN UNTUK MAHASISWA</span>
          <span className="ticker-item-neo">💥 TERVERIFIKASI EMAIL KAMPUS @PRESIDENT.AC.ID</span>
          <span className="ticker-item-neo"><FireOutlined /> MARKETPLACE KAMPUS PRESIDENT UNIVERSITY</span>
          <span className="ticker-item-neo">⚡ COD BEBAS ONGKIR IN CAMPUS</span>
        </div>
      </div>

      {/* Main Neobrutalist Navbar */}
      <header style={{
        background: '#ffffff',
        borderBottom: '3px solid #000000',
        boxShadow: '0 4px 0px #000000',
        padding: '12px 20px',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          {/* Logo Neobrutalist Official */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
            <img 
              src="/logo.png" 
              alt="PresUMart Logo" 
              style={{ 
                height: 'clamp(32px, 8vw, 44px)', 
                width: 'auto',
                objectFit: 'contain',
                borderRadius: 8,
                filter: 'drop-shadow(2px 2px 0px #000000)'
              }} 
            />
          </Link>

          {/* Search Bar Neobrutalist */}
          <div className="hide-mobile" style={{ flex: 1, maxWidth: 480, margin: '0 16px' }}>
            <Input.Search
              placeholder="Cari barang, buku, gadget, jasa..."
              onSearch={handleSearch}
              size="large"
              style={{ borderRadius: 12 }}
              enterButton="Cari!"
            />
          </div>

          {/* Right Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <Tooltip title="Keranjang Belanja">
              <Badge count={cartCount} size="small" color="#ff2a85">
                <Button
                  onClick={() => router.push('/cart')}
                  style={{
                    background: '#00f0ff',
                    border: '3px solid #000000',
                    boxShadow: '3px 3px 0px #000000',
                    borderRadius: 12,
                    width: 42,
                    height: 42,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  icon={<ShoppingCartOutlined style={{ fontSize: 20, color: '#000000' }} />}
                />
              </Badge>
            </Tooltip>

            {user ? (
              <>
                <Tooltip title="Pesan / Live Chat">
                  <Badge count={unreadCount} size="small" color="#ff6b00">
                    <Button
                      onClick={() => setDirectDrawerOpen(true)}
                      style={{
                        background: '#ffe600',
                        border: '3px solid #000000',
                        boxShadow: '3px 3px 0px #000000',
                        borderRadius: 12,
                        width: 42,
                        height: 42,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      icon={<MessageOutlined style={{ fontSize: 20, color: '#000000' }} />}
                    />
                  </Badge>
                </Tooltip>

                <Tooltip title="Jual Barang" className="hide-mobile">
                  <Button
                    onClick={() => router.push('/sell')}
                    style={{
                      background: '#00e676',
                      border: '3px solid #000000',
                      boxShadow: '3px 3px 0px #000000',
                      borderRadius: 12,
                      fontWeight: 900,
                      color: '#000000',
                      height: 42,
                      padding: '0 18px'
                    }}
                    icon={<PlusCircleOutlined />}
                  >
                    Jual Barang!
                  </Button>
                </Tooltip>

                <Dropdown menu={{ items: userMenuItems as any }} placement="bottomRight" trigger={['click']}>
                  <Avatar
                    style={{
                      backgroundColor: '#ff2a85',
                      color: '#ffffff',
                      cursor: 'pointer',
                      border: '3px solid #000000',
                      boxShadow: '3px 3px 0px #000000',
                      fontWeight: 900
                    }}
                    size={40}
                    icon={<UserOutlined />}
                  >
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </Avatar>
                </Dropdown>
              </>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Button
                  onClick={() => router.push('/login')}
                  style={{
                    background: '#ffffff',
                    border: '3px solid #000000',
                    boxShadow: '3px 3px 0px #000000',
                    borderRadius: 12,
                    fontWeight: 900,
                    height: 40,
                    padding: '0 16px'
                  }}
                >
                  Masuk
                </Button>
                <Button
                  onClick={() => router.push('/register')}
                  style={{
                    background: '#ffe600',
                    border: '3px solid #000000',
                    boxShadow: '3px 3px 0px #000000',
                    borderRadius: 12,
                    fontWeight: 900,
                    height: 40,
                    padding: '0 16px'
                  }}
                >
                  Daftar
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Dock Bar */}
      <div className="mobile-bottom-nav">
        <Link href="/" className={`mobile-nav-item ${pathname === '/' ? 'active' : ''}`}>
          <HomeOutlined />
          <span>BERANDA</span>
        </Link>
        <Link href="/cart" className={`mobile-nav-item ${pathname === '/cart' ? 'active' : ''}`}>
          <Badge count={cartCount} size="small" offset={[4, 0]}>
            <ShoppingCartOutlined />
          </Badge>
          <span>KERANJANG</span>
        </Link>
        <Link href="/sell" className={`mobile-nav-item ${pathname === '/sell' ? 'active' : ''}`}>
          <PlusCircleOutlined style={{ color: '#ff2a85' }} />
          <span>JUAL</span>
        </Link>
        <div onClick={() => setDirectDrawerOpen(true)} className="mobile-nav-item" style={{ cursor: 'pointer' }}>
          <Badge count={unreadCount} size="small" offset={[4, 0]}>
            <MessageOutlined />
          </Badge>
          <span>PESAN</span>
        </div>
        <Link href="/profile" className={`mobile-nav-item ${pathname === '/profile' ? 'active' : ''}`}>
          <UserOutlined />
          <span>PROFIL</span>
        </Link>
      </div>

      <DirectChatDrawer open={directDrawerOpen} onClose={() => setDirectDrawerOpen(false)} />
    </>
  );
}

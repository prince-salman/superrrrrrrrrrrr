'use client';

import { Typography, Card, Tag, Button, Row, Col, Space } from 'antd';
import { 
  SafetyCertificateOutlined, 
  ShopOutlined, 
  ThunderboltOutlined, 
  DownloadOutlined,
  CheckCircleOutlined,
  UsergroupAddOutlined,
  DollarOutlined,
  RocketOutlined,
  FireOutlined,
  SmileOutlined
} from '@ant-design/icons';
import Link from 'next/link';

const { Title, Paragraph, Text } = Typography;

export default function Hero() {
  function handleInstallApp() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('trigger-pwa-install'));
    }
  }

  return (
    <div 
      style={{ 
        background: '#ffe600',
        borderBottom: '4px solid #000000', 
        padding: '36px 14px 36px 14px', 
        marginBottom: 28,
        boxShadow: '0 8px 0px #000000'
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Row gutter={[24, 24]} align="middle">
          {/* Left Neobrutalist Content */}
          <Col xs={24} lg={13}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 99,
              background: '#ffffff',
              border: '2px solid #000000',
              boxShadow: '2px 2px 0px #000000',
              marginBottom: 14,
              maxWidth: '100%'
            }}>
              <FireOutlined style={{ color: '#ff2a85', fontSize: 14 }} />
              <span style={{ fontSize: 11, fontWeight: 900, color: '#000000', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                MARKETPLACE RESMI PRESIDENT UNIVERSITY!
              </span>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ 
                color: '#000000', 
                fontSize: 'clamp(1.8rem, 5vw, 3.4rem)', 
                fontWeight: 900, 
                lineHeight: 1.2,
                fontFamily: 'Syne, sans-serif',
                letterSpacing: '-0.03em'
              }}>
                JUAL BELI KAMPUS
              </div>
              <div style={{ marginTop: 6 }}>
                <span style={{ 
                  background: '#ff2a85', 
                  color: '#ffffff', 
                  padding: '4px 12px', 
                  borderRadius: 10,
                  border: '3px solid #000000',
                  boxShadow: '3px 3px 0px #000000',
                  display: 'inline-block',
                  fontSize: 'clamp(1.5rem, 4vw, 2.8rem)',
                  fontWeight: 900,
                  fontFamily: 'Syne, sans-serif',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.25,
                  maxWidth: '100%'
                }}>
                  100% BEBAS ADMIN!
                </span>
              </div>
            </div>

            <Paragraph 
              style={{ 
                color: '#000000', 
                fontSize: '0.95rem', 
                fontWeight: 700,
                marginBottom: 24, 
                maxWidth: 540,
                lineHeight: 1.55
              }}
            >
              Tempat jual beli buku kuliah, perlengkapan kost, gadget & jasa antar mahasiswa President University Jababeka. COD langsung aman di Student Center!
            </Paragraph>

            <Space wrap size="small">
              <Link href="/sell">
                <Button 
                  style={{ 
                    height: 46, 
                    padding: '0 22px', 
                    fontSize: 14, 
                    fontWeight: 900, 
                    borderRadius: 12,
                    background: '#00f0ff',
                    color: '#000000',
                    border: '3px solid #000000',
                    boxShadow: '3px 3px 0px #000000'
                  }}
                  icon={<ShopOutlined />}
                >
                  PASANG IKLAN JUALAN!
                </Button>
              </Link>

              <Button 
                onClick={handleInstallApp}
                style={{ 
                  height: 46, 
                  padding: '0 16px', 
                  fontSize: 13, 
                  fontWeight: 900, 
                  background: '#ffffff', 
                  border: '3px solid #000000',
                  boxShadow: '3px 3px 0px #000000', 
                  color: '#000000',
                  borderRadius: 12,
                }}
                icon={<DownloadOutlined />}
              >
                DOWNLOAD APP
              </Button>
            </Space>
          </Col>

          {/* Right Neobrutalist Cards */}
          <Col xs={24} lg={11}>
            <Row gutter={[12, 12]}>
              <Col span={24}>
                <div style={{
                  background: '#ffffff',
                  border: '3px solid #000000',
                  boxShadow: '4px 4px 0px #000000',
                  borderRadius: 14,
                  padding: '16px'
                }}>
                  <Row align="middle" gutter={12}>
                    <Col>
                      <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: '#00e676',
                        border: '2px solid #000000',
                        boxShadow: '2px 2px 0px #000000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <UsergroupAddOutlined style={{ fontSize: 22, color: '#000000' }} />
                      </div>
                    </Col>
                    <Col flex="auto">
                      <Title level={4} style={{ margin: 0, fontWeight: 900, fontSize: 15, color: '#000000' }}>100% Mahasiswa PresUniv</Title>
                      <Text style={{ fontWeight: 700, color: '#000000', fontSize: 11, display: 'block', marginTop: 1 }}>Terverifikasi email @student.president.ac.id</Text>
                    </Col>
                  </Row>
                </div>
              </Col>

              <Col xs={12} sm={12}>
                <div style={{
                  background: '#00f0ff',
                  border: '3px solid #000000',
                  boxShadow: '4px 4px 0px #000000',
                  borderRadius: 14,
                  padding: '14px'
                }}>
                  <ThunderboltOutlined style={{ fontSize: 22, color: '#000000', marginBottom: 4 }} />
                  <Title level={5} style={{ margin: '0 0 2px 0', fontWeight: 900, color: '#000000', fontSize: 13 }}>COD KAMPUS</Title>
                  <Text style={{ fontWeight: 700, color: '#000000', fontSize: 10, lineHeight: 1.3, display: 'block' }}>Bebas Ongkir di Student Center</Text>
                </div>
              </Col>

              <Col xs={12} sm={12}>
                <div style={{
                  background: '#ff2a85',
                  color: '#ffffff',
                  border: '3px solid #000000',
                  boxShadow: '4px 4px 0px #000000',
                  borderRadius: 14,
                  padding: '14px'
                }}>
                  <DollarOutlined style={{ fontSize: 22, color: '#ffffff', marginBottom: 4 }} />
                  <Title level={5} style={{ margin: '0 0 2px 0', fontWeight: 900, color: '#ffffff', fontSize: 13 }}>0% ADMIN</Title>
                  <Text style={{ fontWeight: 700, color: '#ffffff', fontSize: 10, lineHeight: 1.3, display: 'block' }}>Uang jualan 100% utuh milikmu</Text>
                </div>
              </Col>
            </Row>
          </Col>
        </Row>
      </div>
    </div>
  );
}

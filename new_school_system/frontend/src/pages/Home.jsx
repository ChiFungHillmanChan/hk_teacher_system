import { Link } from 'react-router-dom';
import { GraduationCap, Users, School, BookOpen, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { isAuthenticated } = useAuth();

  const features = [
    {
      icon: <School size={48} />,
      title: '學校管理',
      description: '管理香港18區內嘅多間學校，具備適當嘅驗證同組織功能。'
    },
    {
      icon: <Users size={48} />,
      title: '學生記錄',
      description: '完整嘅學生檔案，包括學術歷史、聯絡資料同成績追蹤。'
    },
    {
      icon: <BookOpen size={48} />,
      title: '學術追蹤',
      description: '追蹤學生喺所有科目嘅進度，提供詳細報告同評估。'
    },
    {
      icon: <BarChart3 size={48} />,
      title: '分析同報告',
      description: '生成全面嘅報告同分析，提供更好嘅教育洞察。'
    }
  ];

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero__container">
          <div className="hero__content">
            <div className="hero__icon">
              <GraduationCap size={64} />
            </div>
            <h1 className="hero__title">
              香港教師學生管理系統
            </h1>
            <p className="hero__subtitle">
              專為香港教育系統而設計嘅全面平台，用於管理學生、學校同學術記錄。
            </p>
            <div className="hero__actions">
              {isAuthenticated ? (
                <Link to="/dashboard" className="btn btn--primary btn--large">
                  前往控制台
                </Link>
              ) : (
                <>
                  <Link to="/login" className="btn btn--primary btn--large">
                    登入
                  </Link>
                  <Link to="/register" className="btn btn--secondary btn--large">
                    註冊成為教師
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="features__container">
          <div className="features__header">
            <h2 className="features__title">
              為香港教育而建
            </h2>
            <p className="features__subtitle">
              專為香港學校、教師同學生設計嘅全面工具。
            </p>
          </div>
          
          <div className="features__grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-card__icon">
                  {feature.icon}
                </div>
                <h3 className="feature-card__title">
                  {feature.title}
                </h3>
                <p className="feature-card__description">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HK Education Integration */}
      <section className="integration">
        <div className="integration__container">
          <div className="integration__content">
            <h2 className="integration__title">
              香港教育系統整合
            </h2>
            <div className="integration__features">
              <div className="integration__feature">
                <h3>香港18區</h3>
                <p>全面覆蓋香港所有18區，具備適當驗證功能。</p>
              </div>
              <div className="integration__feature">
                <h3>小一至小六及中一至中六年級</h3>
                <p>全面支援香港小學同中學教育架構。</p>
              </div>
              <div className="integration__feature">
                <h3>標準香港科目</h3>
                <p>預設配置香港課程所有標準科目。</p>
              </div>
              <div className="integration__feature">
                <h3>學年格式</h3>
                <p>按照香港標準嘅2025/26學年格式。</p>
              </div>
              <div className="integration__feature">
                <h3>雙語支援</h3>
                <p>支援英文同中文姓名及內容。</p>
              </div>
              <div className="integration__feature">
                <h3>角色權限管理</h3>
                <p>為管理員同教師提供不同權限等級。</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="home-footer__container">
          <div className="home-footer__content">
            <div className="home-footer__logo">
              <GraduationCap size={32} />
              <span>香港教師系統</span>
            </div>
            <p className="home-footer__text">
              用❤️為香港教育工作者而建
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
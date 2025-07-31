import { GraduationCap, Heart } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer__container">
        <div className="footer__content">
          <div className="footer__left">
            <div className="footer__logo">
              <GraduationCap size={24} />
              <span className="footer__logo-text">HK Teacher System</span>
            </div>
            <p className="footer__description">
              Student management system for Hong Kong schools
            </p>
          </div>
          
          <div className="footer__center">
            <div className="footer__links">
              <div className="footer__link-group">
                <h4 className="footer__link-title">System</h4>
                <a href="/schools" className="footer__link">Schools</a>
                <a href="/students" className="footer__link">Students</a>
                <a href="/reports" className="footer__link">Reports</a>
                <a href="/analytics" className="footer__link">Analytics</a>
              </div>
              
              <div className="footer__link-group">
                <h4 className="footer__link-title">Account</h4>
                <a href="/profile" className="footer__link">My Profile</a>
                <a href="/settings" className="footer__link">Settings</a>
                <a href="/help" className="footer__link">Help</a>
                <a href="/support" className="footer__link">Support</a>
              </div>
              
              <div className="footer__link-group">
                <h4 className="footer__link-title">Hong Kong</h4>
                <span className="footer__info">18 Districts Supported</span>
                <span className="footer__info">P1-P6 & S1-S6 Grades</span>
                <span className="footer__info">Traditional & Simplified Chinese</span>
                <span className="footer__info">Academic Year 2025/26</span>
              </div>
            </div>
          </div>
          
          <div className="footer__right">
            <div className="footer__made-with">
              <span>Made with</span>
              <Heart size={16} className="footer__heart" />
              <span>for Hong Kong educators</span>
            </div>
            <div className="footer__tech">
              <span>React • Node.js • MongoDB</span>
            </div>
          </div>
        </div>
        
        <div className="footer__bottom">
          <div className="footer__copyright">
            <span>© {currentYear} HK Teacher Student Management System. All rights reserved.</span>
          </div>
          <div className="footer__legal">
            <a href="/privacy" className="footer__legal-link">Privacy Policy</a>
            <a href="/terms" className="footer__legal-link">Terms of Service</a>
            <a href="/cookies" className="footer__legal-link">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
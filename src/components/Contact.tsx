import React, { useState } from 'react';
import { Mail } from 'lucide-react';
import { PROFILE } from '../content';

const LinkedInIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M5.3 7.6H1.7V22h3.6V7.6ZM3.5 2A2.1 2.1 0 1 0 3.5 6.2 2.1 2.1 0 0 0 3.5 2ZM22.3 13.7c0-4.3-2.3-6.3-5.4-6.3a4.7 4.7 0 0 0-4.2 2.3V7.6H9.1V22h3.6v-7.1c0-1.9.4-3.7 2.7-3.7 2.2 0 2.3 2.1 2.3 3.8v7h3.6l1-8.3Z" />
  </svg>
);

const GitHubIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 1.8a10.3 10.3 0 0 0-3.3 20c.5.1.7-.2.7-.5v-2c-2.9.6-3.5-1.2-3.5-1.2-.5-1.2-1.2-1.5-1.2-1.5-1-.7.1-.7.1-.7 1.1.1 1.7 1.1 1.7 1.1 1 1.7 2.6 1.2 3 .9.1-.7.4-1.2.7-1.5-2.3-.3-4.7-1.2-4.7-5.1 0-1.1.4-2.1 1.1-2.8-.1-.3-.5-1.3.1-2.8 0 0 .9-.3 2.8 1.1a9.7 9.7 0 0 1 5.1 0c2-1.4 2.8-1.1 2.8-1.1.6 1.5.2 2.5.1 2.8.7.7 1.1 1.7 1.1 2.8 0 4-2.4 4.8-4.7 5.1.4.3.7 1 .7 2v2.9c0 .3.2.6.7.5A10.3 10.3 0 0 0 12 1.8Z" />
  </svg>
);

const LINKS = [
  { label: PROFILE.email, href: `mailto:${PROFILE.email}`, external: false, icon: Mail },
  { label: 'LinkedIn', href: PROFILE.linkedin, external: true, icon: LinkedInIcon },
  { label: 'GitHub', href: PROFILE.github, external: true, icon: GitHubIcon },
];

/* Full-bleed band on the lighter neutral ground, carrying the same grain as the
   page so the paper reads continuous across the rule. The form hands off to the
   reader's own mail client — no backend, nothing sent anywhere but their draft. */
const Contact: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const subject = `Portfolio — hello from ${name || 'someone'}`;
    const body = `${message}\n\n— ${name}${email ? ` (${email})` : ''}`;
    window.location.href = `mailto:${PROFILE.email}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="contact" id="c-contact">
      <div className="contact-inner">
        <span className="tag tag-outline kicker">say hi</span>
        <h2 className="section-title">Get in Touch</h2>
        <p className="contact-para">
          If something here was useful, wrong, or mildly entertaining — I’d like to
          hear about it. Recruiters, collaborators, and people with strong opinions
          about tooling are all welcome. So are F1 takes, within reason.
        </p>

        <form className="contact-form" onSubmit={onSubmit}>
          <div className="contact-form-row">
            <div className="field">
              <label htmlFor="cf-name">Name</label>
              <input
                id="cf-name"
                className="input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="cf-email">Email</label>
              <input
                id="cf-email"
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="cf-message">Message</label>
            <textarea
              id="cf-message"
              className="input"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Say something…"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block">
            Send message
          </button>
        </form>

        <div className="contact-alt">or reach me directly</div>
        <div className="contact-links">
          {LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <a
                key={link.href}
                className="card contact-card"
                href={link.href}
                aria-label={link.label}
                {...(link.external
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : {})}
              >
                <Icon className="contact-card-icon" aria-hidden="true" />
                <span className="contact-card-label">{link.label}</span>
              </a>
            );
          })}
        </div>
      </div>

      <div className="contact-footer">© 2026 Jian Cheng</div>
    </div>
  );
};

export default Contact;

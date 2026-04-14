import React, { useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import './FAQ.css';

const FAQ = () => {
  const { t } = useContext(LanguageContext);

  const items = [
    { question: t('faqPage.q1'), answer: t('faqPage.a1') },
    { question: t('faqPage.q2'), answer: t('faqPage.a2') },
    { question: t('faqPage.q3'), answer: t('faqPage.a3') },
    { question: t('faqPage.q4'), answer: t('faqPage.a4') },
  ];

  return (
    <div className="faq-page">
      <section className="faq-hero">
        <span className="faq-badge">{t('faqPage.badge')}</span>
        <h1>{t('faqPage.title')}</h1>
        <p>{t('faqPage.intro')}</p>
      </section>

      <section className="faq-list">
        {items.map((item, index) => (
          <article key={index} className="faq-card">
            <h2>{item.question}</h2>
            <p>{item.answer}</p>
          </article>
        ))}
      </section>
    </div>
  );
};

export default FAQ;

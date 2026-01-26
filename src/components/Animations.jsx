import { motion } from 'framer-motion';

// Animación de fade in
export const FadeIn = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.8, delay }}
  >
    {children}
  </motion.div>
);

// Animación de slide in desde arriba
export const SlideInFromTop = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: -50 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay }}
  >
    {children}
  </motion.div>
);

// Animación de slide in desde abajo
export const SlideInFromBottom = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay }}
  >
    {children}
  </motion.div>
);

// Animación de scale (zoom)
export const ScaleIn = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.6, delay }}
  >
    {children}
  </motion.div>
);

// Animación de rotate + fade
export const RotateIn = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, rotate: -10 }}
    animate={{ opacity: 1, rotate: 0 }}
    transition={{ duration: 0.6, delay }}
  >
    {children}
  </motion.div>
);

// Animación hover - levanta el elemento
export const HoverLift = ({ children }) => (
  <motion.div
    whileHover={{ y: -5, boxShadow: '0 20px 30px rgba(0,0,0,0.2)' }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

// Animación hover - scale
export const HoverScale = ({ children, scale = 1.05 }) => (
  <motion.div
    whileHover={{ scale }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

// Animación de aparición en scroll
export const ScrollReveal = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay }}
    viewport={{ once: true, amount: 0.2 }}
  >
    {children}
  </motion.div>
);

// Contenedor para animar múltiples hijos en secuencia
export const StaggerContainer = ({ children, delay = 0 }) => (
  <motion.div
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true }}
    variants={{
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: 0.1,
          delayChildren: delay,
        },
      },
    }}
  >
    {children}
  </motion.div>
);

// Item individual para StaggerContainer
export const StaggerItem = ({ children }) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 },
    }}
    transition={{ duration: 0.5 }}
  >
    {children}
  </motion.div>
);

// Animación de pulse (latido)
export const Pulse = ({ children }) => (
  <motion.div
    animate={{ scale: [1, 1.05, 1] }}
    transition={{ duration: 2, repeat: Infinity }}
  >
    {children}
  </motion.div>
);

// Animación de float (flotar)
export const Float = ({ children }) => (
  <motion.div
    animate={{ y: [0, -10, 0] }}
    transition={{ duration: 3, repeat: Infinity }}
  >
    {children}
  </motion.div>
);

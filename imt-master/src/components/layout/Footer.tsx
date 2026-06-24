"use client";

import { motion } from "framer-motion";

const footerLinks = {
  Plataforma: ["Cenários 3D", "Sinais de Trânsito", "Simulação de Exame", "Estatísticas"],
  Recursos: ["Blog", "Guia do Condutor", "FAQ", "Legislação"],
  Empresa: ["Sobre Nós", "Contacto", "Carreiras", "Imprensa"],
  Legal: ["Termos de Uso", "Privacidade", "Cookies", "Licenças"],
};

export default function Footer() {
  return (
    <footer className="relative border-t border-white/5 bg-surface-950">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="font-display font-bold text-lg">IMT Master</span>
            </div>
            <p className="text-sm text-surface-400 leading-relaxed">
              A plataforma premium de preparação para o exame teórico de condução do IMT.
            </p>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-display font-semibold text-sm text-surface-200 mb-4">
                {category}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link}>
                    <motion.button
                      whileHover={{ x: 3 }}
                      className="text-sm text-surface-500 hover:text-surface-300 transition-colors"
                    >
                      {link}
                    </motion.button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-surface-500">
            &copy; {new Date().getFullYear()} IMT Master. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-6">
            {["Twitter", "Instagram", "LinkedIn", "YouTube"].map((social) => (
              <motion.button
                key={social}
                whileHover={{ scale: 1.1, y: -2 }}
                className="text-sm text-surface-500 hover:text-surface-300 transition-colors"
              >
                {social}
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

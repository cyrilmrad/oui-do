"use client";

import { motion, Variants } from "framer-motion";
import Link from "next/link";
import { Heart, Sparkles, Smartphone, MailOpen, UserCircle, ArrowRight } from "lucide-react";

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-stone-900 font-sans selection:bg-emerald-200 overflow-hidden flex flex-col">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="font-serif italic text-2xl tracking-wider text-emerald-900 flex items-center gap-2">
            <Heart className="w-5 h-5 text-emerald-700 fill-emerald-700/20" />
            oui-do
          </Link>
          <div className="flex gap-4 items-center">
            <Link href="/login" className="text-sm font-medium uppercase tracking-widest text-stone-600 hover:text-stone-900 transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-grow pt-32 pb-24">
        {/* Hero Section */}
        <section className="relative max-w-6xl mx-auto px-6 py-20 lg:py-32 flex flex-col items-center text-center">
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-100/40 rounded-full blur-3xl -z-10"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.5, 0.7, 0.5]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />

          <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="flex flex-col items-center max-w-4xl mx-auto">
            <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-800 text-sm font-medium mb-8 border border-emerald-100">
              <Sparkles className="w-4 h-4" />
              <span>The modern way to invite</span>
            </motion.div>

            <motion.h1 variants={fadeIn} className="text-5xl md:text-7xl font-serif text-stone-900 leading-tight mb-8">
              Life's most beautiful moments, <br className="hidden md:block" />
              <span className="italic font-light text-emerald-800">beautifully shared.</span>
            </motion.h1>

            <motion.p variants={fadeIn} className="text-lg md:text-xl text-stone-500 font-light max-w-2xl leading-relaxed mb-12">
              Create breathtaking digital invitations, effortlessly track RSVPs, and manage your special events through our elegant, bespoke dashboard platform.
            </motion.p>

            <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link href="/login" className="px-8 py-4 bg-stone-900 text-white rounded-full font-medium tracking-wide uppercase text-sm hover:bg-stone-800 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-stone-900/20">
                Experience oui-do <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* Features Split */}
        <section className="max-w-6xl mx-auto px-6 py-24 border-t border-stone-200">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-12"
          >
            {/* Feature 1 */}
            <motion.div variants={fadeIn} className="flex flex-col items-center text-center p-8 rounded-3xl bg-white border border-stone-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center mb-6">
                <MailOpen className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-serif mb-4 text-stone-800">Bespoke Invitations</h3>
              <p className="text-stone-500 font-light leading-relaxed text-sm">Design elegant digital invitations that capture the essence of your aesthetic perfectly. No paper, absolutely stunning.</p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div variants={fadeIn} className="flex flex-col items-center text-center p-8 rounded-3xl bg-white border border-stone-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center mb-6">
                <UserCircle className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-serif mb-4 text-stone-800">Effortless RSVPs</h3>
              <p className="text-stone-500 font-light leading-relaxed text-sm">Guests easily submit their attendance, dietary needs, or personal notes in a fluid, motion-driven experience.</p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div variants={fadeIn} className="flex flex-col items-center text-center p-8 rounded-3xl bg-white border border-stone-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center mb-6">
                <Smartphone className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-serif mb-4 text-stone-800">Client Dashboard</h3>
              <p className="text-stone-500 font-light leading-relaxed text-sm">A centralized command center to instantly preview updates, manage gift registries, and view guest messages live.</p>
            </motion.div>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto bg-white border-t border-stone-200 py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="font-serif italic text-xl tracking-wider text-emerald-900 flex items-center gap-2">
            <Heart className="w-4 h-4 text-emerald-700" />
            oui-do
          </div>
          <p className="text-stone-400 text-sm font-light">
            © {new Date().getFullYear()} oui-do. Crafted for beautiful events.
          </p>
        </div>
      </footer>
    </div>
  );
}

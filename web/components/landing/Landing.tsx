import Cursor from "@/components/landing/Cursor";
import Experience from "@/components/landing/Experience";
import Header from "@/components/landing/Header";
import ScrollRail from "@/components/landing/ScrollRail";
import SourceHero from "@/components/landing/heroes/SourceHero";
import Build from "@/components/landing/sections/Build";
import Cta from "@/components/landing/sections/Cta";
import Faq from "@/components/landing/sections/Faq";
import FieldNotes from "@/components/landing/sections/FieldNotes";
import Footer from "@/components/landing/sections/Footer";
import HowItWorks from "@/components/landing/sections/HowItWorks";
import Marquee from "@/components/landing/sections/Marquee";
import Network from "@/components/landing/sections/Network";
import Problem from "@/components/landing/sections/Problem";
import { fontVariables } from "./fonts";
import "./landing.css";

export default function Landing() {
  return (
    <div className={`claros-landing ${fontVariables}`}>
      <Experience>
        <Header />
        <ScrollRail />
        <Cursor />
        <main>
          <SourceHero />
          <Marquee />
          <FieldNotes />
          <Problem />
          <HowItWorks />
          <Network />
          <Build />
          <Faq />
          <Cta />
        </main>
        <Footer />
        <div className="grain" aria-hidden="true" />
      </Experience>
    </div>
  );
}

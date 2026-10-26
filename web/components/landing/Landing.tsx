import Cursor from "@/components/landing/Cursor";
import Experience from "@/components/landing/Experience";
import Header from "@/components/landing/Header";
import HeroSwitcher, { type HeroName } from "@/components/landing/HeroSwitcher";
import ScrollRail from "@/components/landing/ScrollRail";
import Stage from "@/components/landing/Stage";
import Welcome from "@/components/landing/Welcome";
import AttestedHero from "@/components/landing/heroes/AttestedHero";
import PrintHero from "@/components/landing/heroes/PrintHero";
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

const HEROES = { print: PrintHero, attested: AttestedHero };

export default function Landing({ hero }: { hero: HeroName }) {
  const Hero = HEROES[hero];
  return (
    <div className={`claros-landing ${fontVariables}`}>
      <Experience>
        <Stage />
        <Welcome />
        <Header />
        <ScrollRail />
        <Cursor />
        <HeroSwitcher current={hero} />
        <main>
          <Hero />
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

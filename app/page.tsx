import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Workstation from "@/components/Workstation";
import Clients from "@/components/Clients";
import Services from "@/components/Services";
import Results from "@/components/Results";
import Projects from "@/components/Projects";
import Proof from "@/components/Proof";
import Testimonials from "@/components/Testimonials";
import Experience from "@/components/Experience";
import Skills from "@/components/Skills";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Nav />
      <Hero />
      <Workstation />
      <Clients />
      <Services />
      <Results />
      <Projects />
      <Proof />
      <Testimonials />
      <Experience />
      <Skills />
      <Contact />
      <Footer />
    </main>
  );
}

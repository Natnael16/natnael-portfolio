import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/hero/Hero";
import { Stack } from "@/components/sections/Stack";
import { Work } from "@/components/sections/Work";
import { Proof } from "@/components/sections/Proof";
import { Path } from "@/components/sections/Path";
import { Words } from "@/components/sections/Words";
import { Contact } from "@/components/sections/Contact";
import { RevealObserver } from "@/components/ui/RevealObserver";
import { SmoothScroll } from "@/lib/scroll";

export function App() {
  return (
    <>
      <SmoothScroll />
      <RevealObserver />
      <Navigation />
      <main>
        <Hero />
        <Words />
        <Proof />
        <Work />
        <Stack />
        <Path />
        <Contact />
      </main>
    </>
  );
}

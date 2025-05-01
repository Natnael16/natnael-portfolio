import { HeroSection } from './components/HeroSection';
import { SkillsSection } from './components/SkillsSection';
import { ProjectsSection } from './components/ProjectsSection';
import { ContactSection } from './components/ContactSection';
import Experience from './components/Experience';

export default function WebDeveloperPortfolio() {
	return (
		<main className="min-h-screen bg-[#0D1117] text-white">
			<HeroSection />
			<Experience />
			<SkillsSection />
			<ProjectsSection />
			<ContactSection />
		</main>
	);
}

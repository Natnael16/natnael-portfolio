import React from 'react';

export const SkillsSection = () => {
	const skills = {
		'Mobile Development': [
			{ name: 'Flutter', level: 'Expert' },
			{ name: 'Dart', level: 'Expert' },
			{ name: 'Bloc', level: 'Expert' },
			{ name: 'Firebase', level: 'Advanced' },
			{ name: 'Supabase', level: 'Advanced' },
		],
		'Backend Development': [
			{ name: 'Python', level: 'Expert' },
			{ name: 'Django', level: 'Expert' },
			{ name: 'REST APIs', level: 'Expert' },
			{ name: 'Node.js', level: 'Advanced' },
			{ name: 'PostgreSQL', level: 'Advanced' },
			{ name: 'MongoDB', level: 'Advanced' },

		],
		'Frontend Development': [
			{ name: 'React', level: 'Advanced' },
			{ name: 'Next.js', level: 'Advanced' },
			{ name: 'TypeScript', level: 'Advanced' },
			{ name: 'Tailwind CSS', level: 'Advanced' },
		],
		'Other Skills': [
			{ name: 'Git', level: 'Advanced' },
			{ name: 'Docker', level: 'Intermediate' },
			{ name: 'CI/CD', level: 'Intermediate' },
			{ name: 'AWS', level: 'Intermediate' },
		],
	};

	return (
		<section id="skills" className="py-20 px-4 bg-[#161B22]">
			<div className="max-w-6xl mx-auto">
				<h2 className="text-2xl sm:text-3xl font-bold mb-8 sm:mb-16 text-center text-white">Technical Expertise</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
					{Object.entries(skills).map(([category, items]) => (
						<div key={category} className="bg-[#21262D] rounded-lg p-6 transform hover:scale-[1.02] transition-all">
							<h3 className="text-xl font-bold text-white mb-4">{category}</h3>
							<ul className="space-y-3">
								{items.map((skill) => (
									<li key={skill.name} className="flex justify-between items-center">
										<span className="text-gray-300">{skill.name}</span>
										<span className={`px-2 py-1 rounded-full text-sm ${
											skill.level === 'Expert' ? 'bg-green-900/50 text-green-400' :
											skill.level === 'Advanced' ? 'bg-blue-900/50 text-blue-400' :
											'bg-yellow-900/50 text-yellow-400'
										}`}>
											{skill.level}
										</span>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>
			</div>
		</section>
	);
};


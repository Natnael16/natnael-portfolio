import React from 'react';

export const SkillsSection = () => {
	const skills = {
		'Mobile': [
			{ name: 'Flutter', level: 'Expert' },
			{ name: 'Dart', level: 'Expert' },
			{ name: 'Bloc', level: 'Expert' },
			{ name: 'Firebase', level: 'Advanced' },
			{ name: 'Supabase', level: 'Advanced' },
		],
		'Backend': [
			{ name: 'Python', level: 'Expert' },
			{ name: 'Django', level: 'Expert' },
			{ name: 'REST APIs', level: 'Expert' },
			{ name: 'Node.js', level: 'Advanced' },
			{ name: 'PostgreSQL', level: 'Advanced' },
			{ name: 'MongoDB', level: 'Advanced' },
		],
		'Frontend': [
			{ name: 'React', level: 'Advanced' },
			{ name: 'Next.js', level: 'Advanced' },
			{ name: 'TypeScript', level: 'Advanced' },
			{ name: 'Tailwind CSS', level: 'Advanced' },
		],
		'DevOps': [
			{ name: 'Git', level: 'Advanced' },
			{ name: 'Docker', level: 'Intermediate' },
			{ name: 'CI/CD', level: 'Intermediate' },
			{ name: 'AWS', level: 'Intermediate' },
		],
	};

	return (
		<section id="skills" className="py-20 px-4 bg-[#0D1117]">
			<div className="max-w-6xl mx-auto">
				<h2 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 text-center">
					Skills
				</h2>
				<p className="text-gray-400 max-w-2xl mx-auto text-center mb-8 sm:mb-16">
					My technical skills and expertise
				</p>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
					{Object.entries(skills).map(([category, items]) => (
						<div 
							key={category} 
							className="bg-[#161B22] rounded-lg p-6 transform hover:scale-[1.02] transition-all border border-gray-800 hover:border-blue-500/50 group"
						>
							<div className="flex items-center gap-2 mb-6">
								<div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-500"></div>
								<h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">{category}</h3>
							</div>
							<ul className="space-y-4">
								{items.map((skill) => (
									<li key={skill.name} className="flex justify-between items-center group/item">
										<span className="text-gray-300 group-hover/item:text-white transition-colors">{skill.name}</span>
										<span className={`px-3 py-1 rounded-full text-sm font-medium ${
											skill.level === 'Expert' ? 'bg-green-900/30 text-green-400 border border-green-500/30' :
											skill.level === 'Advanced' ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30' :
											'bg-yellow-900/30 text-yellow-400 border border-yellow-500/30'
										} group-hover/item:scale-105 transition-transform`}>
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


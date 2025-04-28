"use client";
import React, { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
const projects = [
  {
    title: 'QuickSync',
    description: 'A high-performance web application for real-time file and inventory synchronization across eCommerce platforms, serving 10K+ daily users with seamless Django-powered integrations.',
    techStack: ['Django', 'React', 'Python', 'WebSocket', 'MongoDB'],
    images: ['/projects/quicksync1.png', '/projects/quicksync2.png', '/projects/quicksync3.png'],
    link: 'https://quicksync.pro',
    category: 'Web App'
  },
  {
    title: 'RideShare',
    description: 'A Flutter-based ride-hailing mobile app that connects drivers and riders in real time, featuring Google Maps navigation, SignalR for live updates, and Bloc state management.',
    techStack: ['Flutter', 'Dart', 'Google Maps API', 'Bloc', 'SignalR', 'Node.js'],
    images: ['/projects/rideshare1.jpg', '/projects/rideshare2.jpg', '/projects/rideshare3.jpg', '/projects/rideshare4.png', '/projects/rideshare5.png'],
    link: 'https://rideshare.a2sv.org',
    category: 'Mobile App'
  },
     {
    title: 'Yalla Gai',
    description: 'A sophisticated ride-hailing app with a polished, intuitive Flutter UI featuring custom animations, responsive layouts, and seamless navigation flows.',
    techStack: ['Flutter', 'Dart', 'Bloc', 'Flutter Animations', 'Custom UI/UX'],
    images: ['/projects/yalla1.jpg', '/projects/yalla1.1.jpg', '/projects/yalla2.jpg', '/projects/yalla3.jpg', '/projects/yalla4.jpg', '/projects/yalla5.jpg', '/projects/yalla6.jpg', '/projects/yalla7.jpg', '/projects/yalla8.jpg'],
    link: '#',
    category: 'Mobile App'
  },
  {
    title: 'Rate Eat',
    description: 'A geolocation-driven restaurant review platform built with Flutter and Node.js, empowering users to discover and rate local eateries with advanced filtering and community insights.',
    techStack: ['Flutter', 'Node.js'],
    images: ['/projects/re 1.jpg', '/projects/re 2.jpg', '/projects/re 3.jpg', '/projects/re 4.jpg', '/projects/re 5.jpg', '/projects/re 6.jpg'],
    link: 'https://rateeat.app',
    category: 'Web & Mobile App'
  },

  {
    title: 'Verbinden',
    description: 'A social networking app that enables friends to connect, chat one-on-one or in groups, and set and track personal and shared goals to stay motivated together.',
    techStack: ['Flutter', 'Django', 'Bloc'],
    images: ['/projects/verb1.jpg', '/projects/verb2.jpg', '/projects/verb3.jpg', '/projects/verb4.jpg', '/projects/verb5.jpg', '/projects/verb6.jpg'],
    link: '#',
    category: 'Mobile App'
  },
 
];


export const ProjectsSection = () => {
	const [activeImageIndex, setActiveImageIndex] = useState<{ [key: string]: number }>({});

	const handleImageClick = (projectTitle: string, direction: 'prev' | 'next') => {
		setActiveImageIndex(prev => {
			const currentIndex = prev[projectTitle] || 0;
			const project = projects.find(p => p.title === projectTitle);
			if (!project) return prev;

			const newIndex = direction === 'next' 
				? (currentIndex + 1) % project.images.length
				: (currentIndex - 1 + project.images.length) % project.images.length;

			return { ...prev, [projectTitle]: newIndex };
		});
	};

	const handleKeyDown = (e: React.KeyboardEvent, projectTitle: string, direction: 'prev' | 'next') => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleImageClick(projectTitle, direction);
		}
	};

	return (
		<section id="projects" className="py-20 px-4 bg-[#161B22] scroll-mt-20">
			<div className="max-w-6xl mx-auto">
				<motion.h2 
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="text-2xl sm:text-3xl font-bold mb-8 sm:mb-12 text-center text-white"
				>
					Featured Projects
				</motion.h2>
				
				<div className="space-y-16">
					{projects.map((project, projectIndex) => {
						const currentImageIndex = activeImageIndex[project.title] || 0;
						
						return (
							<motion.div
								key={project.title}
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.5 }}
								className="bg-[#21262D] rounded-lg overflow-hidden transform hover:scale-[1.02] transition-all shadow-sm"
							>
								<div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
									<div className="relative h-[400px] group bg-[#161B22] flex items-center justify-center">
										<div className="absolute inset-0 flex items-center justify-center p-4">
											<Image
												src={project.images[currentImageIndex]}
												alt={`${project.title} - Screenshot ${currentImageIndex + 1}`}
												width={800}
												height={600}
												className="object-contain max-h-full max-w-full"
												priority={projectIndex === 0}
												loading={projectIndex === 0 ? "eager" : "lazy"}
											/>
										</div>
										<div className="absolute inset-0 bg-gradient-to-b from-[#21262D]/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
										
										{/* Navigation Buttons */}
										{project.images.length > 1 && (
											<>
												<button
													onClick={() => handleImageClick(project.title, 'prev')}
													onKeyDown={(e) => handleKeyDown(e, project.title, 'prev')}
													className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#161B22]"
													aria-label="Previous image"
												>
													←
												</button>
												<button
													onClick={() => handleImageClick(project.title, 'next')}
													onKeyDown={(e) => handleKeyDown(e, project.title, 'next')}
													className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#161B22]"
													aria-label="Next image"
												>
													→
												</button>
											</>
										)}
										
										{/* Image Indicators */}
										{project.images.length > 1 && (
											<div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
												{project.images.map((_, index) => (
													<button
														key={index}
														onClick={() => setActiveImageIndex(prev => ({ ...prev, [project.title]: index }))}
														onKeyDown={(e) => {
															if (e.key === 'Enter' || e.key === ' ') {
																e.preventDefault();
																setActiveImageIndex(prev => ({ ...prev, [project.title]: index }));
															}
														}}
														className={`w-2 h-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#161B22] ${
															index === currentImageIndex ? 'bg-white' : 'bg-white/50'
														}`}
														aria-label={`Go to image ${index + 1}`}
													/>
												))}
											</div>
										)}
									</div>
									
									<div className="p-8 space-y-6">
										<div>
											<h3 className="text-2xl font-bold text-white mb-2">{project.title}</h3>
											<span className="inline-block px-3 py-1 bg-[#30363D] text-gray-300 rounded-full text-sm mb-4">
												{project.category}
											</span>
										</div>
										
										<p className="text-gray-400">{project.description}</p>
										
										<div className="flex flex-wrap gap-2">
											{project.techStack.map((tech) => (
												<span
													key={tech}
													className="px-3 py-1 bg-[#30363D] text-gray-300 rounded-full text-sm"
												>
													{tech}
												</span>
											))}
										</div>
										
										<a
											href={project.link}
											className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#21262D]"
											target="_blank"
											rel="noopener noreferrer"
										>
											View Project
											<svg
												className="w-4 h-4 ml-2"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
												aria-hidden="true"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M14 5l7 7m0 0l-7 7m7-7H3"
												/>
											</svg>
										</a>
									</div>
								</div>
							</motion.div>
						);
					})}
				</div>
			</div>
		</section>
	);
};

export default ProjectsSection;


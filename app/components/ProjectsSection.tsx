"use client";
import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
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
	const [direction, setDirection] = useState<{ [key: string]: number }>({});

	const handleImageClick = (projectTitle: string, direction: 'prev' | 'next') => {
		setDirection(prev => ({ ...prev, [projectTitle]: direction === 'next' ? 1 : -1 }));
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

	const slideVariants = {
		enter: (direction: number) => ({
			x: direction > 0 ? 1000 : -1000,
			opacity: 0
		}),
		center: {
			zIndex: 1,
			x: 0,
			opacity: 1
		},
		exit: (direction: number) => ({
			zIndex: 0,
			x: direction < 0 ? 1000 : -1000,
			opacity: 0
		})
	};

	const swipeConfidenceThreshold = 10000;
	const swipePower = (offset: number, velocity: number) => {
		return Math.abs(offset) * velocity;
	};

	return (
		<section id="projects" className="py-20 px-4 bg-[#0D1117] scroll-mt-20">
			<div className="max-w-6xl mx-auto">
				<motion.h2 
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 text-center"
				>
					Projects
				</motion.h2>
				<motion.p 
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.2 }}
					className="text-gray-400 max-w-2xl mx-auto text-center mb-8 sm:mb-12"
				>
					My recent work and contributions
				</motion.p>
				
				<div className="space-y-16">
					{projects.map((project, projectIndex) => {
						const currentImageIndex = activeImageIndex[project.title] || 0;
						const currentDirection = direction[project.title] || 0;
						
						return (
							<motion.div
								key={project.title}
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.5 }}
								className="bg-[#161B22] rounded-lg overflow-hidden transform hover:scale-[1.02] transition-all shadow-sm border border-gray-800 hover:border-blue-500/50 group"
							>
								<div className="relative h-[500px] sm:h-[600px] group bg-[#161B22] flex items-center justify-center overflow-hidden">
									<AnimatePresence initial={false} custom={currentDirection}>
										<motion.div
											key={currentImageIndex}
											custom={currentDirection}
											variants={slideVariants}
											initial="enter"
											animate="center"
											exit="exit"
											transition={{
												x: { type: "spring", stiffness: 300, damping: 30 },
												opacity: { duration: 0.2 }
											}}
											drag="x"
											dragConstraints={{ left: -200, right: 200 }}
											dragElastic={0.2}
											dragMomentum={false}
											onDragEnd={(e, { offset, velocity }) => {
												const swipe = swipePower(offset.x, velocity.x);

												if (swipe < -swipeConfidenceThreshold) {
													handleImageClick(project.title, 'next');
												} else if (swipe > swipeConfidenceThreshold) {
													handleImageClick(project.title, 'prev');
												}
											}}
											className="absolute inset-0 flex items-center justify-center p-4 cursor-pointer"
										>
											<Image
												src={project.images[currentImageIndex]}
												alt={`${project.title} - Screenshot ${currentImageIndex + 1}`}
												width={800}
												height={600}
												className="object-contain max-h-full max-w-full rounded-lg select-none pointer-events-none"
												priority={projectIndex === 0}
												loading={projectIndex === 0 ? "eager" : "lazy"}
											/>
										</motion.div>
									</AnimatePresence>
									
									{/* Navigation Buttons */}
									{project.images.length > 1 && (
										<>
											<button
												onClick={(e) => {
													e.stopPropagation();
													handleImageClick(project.title, 'prev');
												}}
												className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-3 rounded-full hover:bg-black/70 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#161B22] opacity-0 group-hover:opacity-100 transition-opacity z-10"
												aria-label="Previous image"
											>
												←
											</button>
											<button
												onClick={(e) => {
													e.stopPropagation();
													handleImageClick(project.title, 'next');
												}}
												className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-3 rounded-full hover:bg-black/70 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#161B22] opacity-0 group-hover:opacity-100 transition-opacity z-10"
												aria-label="Next image"
											>
												→
											</button>
										</>
									)}
									
									{/* Image Indicators */}
									{project.images.length > 1 && (
										<div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
											{project.images.map((_, index) => (
												<button
													key={index}
													onClick={(e) => {
														e.stopPropagation();
														setActiveImageIndex(prev => ({ ...prev, [project.title]: index }));
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
									<div className="flex items-center justify-between">
										<div>
											<h3 className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors">{project.title}</h3>
											<span className="inline-block px-3 py-1 bg-[#21262D] text-gray-300 rounded-full text-sm mt-2 border border-gray-700">
												{project.category}
											</span>
										</div>
										<a
											href={project.link}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:opacity-90 transition-opacity"
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
									
									<p className="text-gray-400">{project.description}</p>
									
									<div className="flex flex-wrap gap-2">
										{project.techStack.map((tech) => (
											<span
												key={tech}
												className="px-3 py-1 bg-[#21262D] text-gray-300 rounded-full text-sm border border-gray-700 hover:border-blue-500/50 transition-colors"
											>
												{tech}
											</span>
										))}
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


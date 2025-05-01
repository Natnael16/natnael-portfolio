import React from 'react';
import { socialIcons } from './SocialIcons';

export const HeroSection = () => {
	return (
		<div className="relative min-h-screen flex items-center justify-center overflow-hidden">
			{/* Animated Background Grid */}
			<div className="absolute inset-0 grid-background opacity-20">
				<div className="grid-overlay animate-pulse-slow"></div>
			</div>

			{/* Floating Tech Icons */}
			<div className="absolute inset-0 overflow-hidden">
				{[
					{ icon: '⚛️', delay: '0s', position: 'top-20 left-1/4' },
					{ icon: '🚀', delay: '2s', position: 'top-40 right-1/3' },
					{ icon: '💻', delay: '1s', position: 'bottom-32 left-1/3' },
					{ icon: '📱', delay: '3s', position: 'bottom-20 right-1/4' },
				].map((item, index) => (
					<div key={index} className={`absolute ${item.position} animate-float opacity-50`} style={{ animationDelay: item.delay }}>
						<span className="text-4xl">{item.icon}</span>
					</div>
				))}
			</div>

			{/* Hero Content */}
			<div className="relative z-10 max-w-5xl mx-auto px-4">
				<div className="text-center space-y-6">
					{/* Name Section */}
					<div className="relative inline-block px-4 sm:px-0">
						<div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl blur-xl opacity-75"></div>
						<h1 className="relative text-5xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300 pb-2">
							Natnael Denbi
						</h1>
					</div>

					{/* Role & Description */}
					<div className="space-y-4 sm:space-y-6 mt-6 sm:mt-8">
						<div className="flex flex-col items-center gap-4">
							<div className="flex items-center gap-3">
								<span className="h-[1px] w-8 sm:w-12 bg-blue-500"></span>
								<h2 className="text-xl sm:text-2xl font-light tracking-wide text-blue-400">Software Engineer | Full-Stack Developer</h2>
								<span className="h-[1px] w-8 sm:w-12 bg-blue-500"></span>
							</div>
							<p className="text-base sm:text-lg text-gray-400 max-w-2xl px-4 sm:px-0">
								Innovative Software Engineer with 3+ years of experience delivering scalable, full-stack solutions. 
								Proven team leader with a strong track record in designing high-impact applications.
							</p>
						</div>

						{/* Tech Stack Pills */}
						<div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-6 sm:mt-8 px-4 sm:px-0">
							{['Django', 'Flutter', 'Node.js', 'React', 'Next.js'].map((tech) => (
								<span
									key={tech}
									className="px-3 sm:px-4 py-1 sm:py-1.5 bg-[#1A1F2B] rounded-full text-sm font-medium text-gray-300 border border-[#2D333B] hover:border-blue-500/50 transition-colors"
								>
									{tech}
								</span>
							))}
						</div>
					</div>

					{/* CTA Buttons */}
					<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
						<a
							href="https://www.upwork.com/freelancers/natnaelt5?mp_source=share"
							target="_blank"
							rel="noopener noreferrer"
							className="group relative inline-flex items-center justify-center"
						>
							<div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur opacity-75 group-hover:opacity-100 transition"></div>
							<span className="relative px-6 sm:px-8 py-3 bg-[#161B22] rounded-full inline-flex items-center justify-center w-full sm:w-auto">
								Hire Me on Upwork
								<svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
								</svg>
							</span>
						</a>
						<a
							href="mailto:natnaeldenbi@gmail.com"
							className="group relative inline-flex items-center justify-center"
						>
							<div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur opacity-75 group-hover:opacity-100 transition"></div>
							<span className="relative px-6 sm:px-8 py-3 bg-[#161B22] rounded-full inline-flex items-center justify-center w-full sm:w-auto">
								Get in Touch
								<svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
								</svg>
							</span>
						</a>
					</div>

					{/* Social Links */}
					<div className="flex justify-center gap-4 sm:gap-6 mt-8 sm:mt-12">
						{[
							{ name: 'GitHub', icon: socialIcons.github, href: 'https://github.com/Natnael16' },
							{ name: 'LinkedIn', icon: socialIcons.linkedin, href: 'https://www.linkedin.com/in/natnael-denbi-b3534b230' },
							{ name: 'Email', icon: socialIcons.email, href: 'mailto:natnaeldenbi@gmail.com' },
						].map((social) => (
							<a 
								key={social.name} 
								href={social.href} 
								className="group relative p-2 sm:p-3 hover:text-blue-400 transition-colors" 
								aria-label={social.name}
								target="_blank"
								rel="noopener noreferrer"
							>
								<span className="text-xl sm:text-2xl group-hover:scale-110 transition-transform inline-block">{social.icon}</span>
							</a>
						))}
					</div>
				</div>
			</div>

			{/* Scroll Indicator */}
			<div className="absolute bottom-8 inset-x-0 flex flex-col items-center animate-bounce">
				<span className="text-gray-400 text-sm mb-2 text-center">Scroll to explore</span>
				<svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
				</svg>
			</div>
		</div>
	);
};

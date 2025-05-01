import React from 'react';

export const ContactSection = () => {
	return (
		<section id="contact" className="py-12 sm:py-20 px-4 bg-[#0D1117] scroll-mt-20">
			<div className="max-w-4xl mx-auto text-center px-4 sm:px-6">
				<h2 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
					Let&apos;s Build Something Amazing
				</h2>
				<p className="text-sm sm:text-base text-gray-400 mb-6">Looking for a developer who can create high-performance, interactive software products?</p>

				{/* Contact Information */}
				<div className="flex flex-col items-center gap-4 mb-8">
					<div className="flex items-center justify-center gap-4">
						<a 
							href="mailto:natnaeldenbi@gmail.com" 
							className="flex items-center gap-2 text-gray-300 hover:text-blue-400 transition-colors"
						>
							<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
							</svg>
							natnaeldenbi@gmail.com
						</a>
						<span className="text-gray-600">|</span>
						<a 
							href="tel:+251912345678" 
							className="flex items-center gap-2 text-gray-300 hover:text-blue-400 transition-colors"
						>
							<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
							</svg>
							+251 961088592
						</a>
					</div>
				</div>

				{/* Location */}
				<div className="flex items-center justify-center gap-2 text-gray-400 mb-8">
					<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
					</svg>
					<span>Addis Ababa, Ethiopia</span>
				</div>

				{/* Action Buttons */}
				<div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
					<a
						href="https://www.upwork.com/freelancers/natnaelt5?mp_source=share"
						target="_blank"
						rel="noopener noreferrer"
						className="group relative inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg text-white font-bold hover:opacity-90 transition-all transform hover:scale-105"
					>
						<div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur opacity-75 group-hover:opacity-100 transition"></div>
						<span className="relative flex items-center gap-2">
							Hire Me on Upwork
							<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3"/>
							</svg>
						</span>
					</a>
					<a
						href="mailto:natnaeldenbi@gmail.com"
						className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#161B22] rounded-lg font-medium hover:bg-[#21262D] transition-colors border border-gray-800 hover:border-blue-500/50"
					>
						<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
						</svg>
						Get in Touch
					</a>
				</div>

				{/* Social Links */}
				<div className="flex justify-center gap-6">
					{[
						{ name: 'GitHub', icon: 'github', href: 'https://github.com/Natnael16' },
						{ name: 'LinkedIn', icon: 'linkedin', href: 'https://www.linkedin.com/in/natnael-denbi-b3534b230' },
						{ name: 'Upwork', icon: 'upwork', href: 'https://www.upwork.com/freelancers/natnaelt5?mp_source=share' },
					].map((social) => (
						<a
							key={social.name}
							href={social.href}
							target="_blank"
							rel="noopener noreferrer"
							className="text-gray-400 hover:text-blue-400 transition-colors"
							aria-label={social.name}
						>
							{social.name}
						</a>
					))}
				</div>
			</div>
		</section>
	);
};

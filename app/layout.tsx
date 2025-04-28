import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

export const metadata: Metadata = {
	title: 'Natnael - Full Stack Developer',
	description:
		'Experienced Full Stack Developer specializing in Flutter, Django, React, Next.js, and Node.js. Building modern web applications and mobile solutions with a focus on performance, scalability, and user experience.',
	keywords: [
		'Full Stack Developer',
		'Flutter Developer',
		'Django Developer',
		'React Developer',
		'Next.js Developer',
		'Node.js Developer',
		'Mobile Development',
		'Backend Development',
		'Frontend Development',
		'JavaScript',
		'TypeScript',
		'Python',
		'Dart',
		'HTML5',
		'CSS3',
		'Responsive Design',
		'UI/UX',
		'Web Development',
		'Mobile App Development',
		'API Development',
		'Database Design',
		'Performance Optimization',
		'Natnael',
	],
	authors: [{ name: 'Natnael' }],
	creator: 'Natnael',
	openGraph: {
		title: 'Natnael - Full Stack Developer Portfolio',
		description: 'Full Stack Developer specializing in web and mobile development. Expert in Flutter, Django, React, Next.js, and Node.js. Building scalable and performant applications.',
		url: 'https://natnael-portfolio.vercel.app',
		siteName: 'Natnael - Portfolio',
		locale: 'en_US',
		type: 'website',
	},
	twitter: {
		card: 'summary',
		title: 'Natnael - Full Stack Developer',
		description: 'Full Stack Developer specializing in web and mobile development. Expert in Flutter, Django, React, Next.js, and Node.js.',
	},
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			'max-video-preview': -1,
			'max-image-preview': 'large',
			'max-snippet': -1,
		},
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
		</html>
	);
}

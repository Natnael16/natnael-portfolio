'use client';

import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

interface ExperienceItem {
  year: string;
  title: string;
  company: string;
  location: string;
  type: string;
  description: string[];
  stack: string[];
}

const experiences: ExperienceItem[] = [
  {
    year: 'Mar 2024 – Present',
    title: 'Software Engineer',
    company: 'The Quick Company',
    location: 'Remote (UAE)',
    type: 'Full-time',
    description: [
      'Building and maintaining a real-world e-commerce syncing platform used by 10,000+ daily users.',
      'Gained hands-on experience working in a production-grade system with robust DevOps tools and monitoring systems.',
      'Refactored Django APIs with concurrent threading to cut execution time by 52%, significantly boosting performance.',
      'Developed scalable, secure APIs and intuitive front-end interfaces while collaborating in a cloud-native stack.',
      'Learned and applied powerful industry tools: Sentry, GraphQL, Kubernetes, Docker, PostgreSQL, and more.'
    ],
    stack: ['Django', 'React.js', 'PostgreSQL', 'Sentry', 'GraphQL', 'Kubernetes', 'Docker']
  },
  {
    year: 'Dec 2022 – Jun 2024',
    title: 'Head of Education',
    company: 'A2SV | Africa to Silicon Valley',
    location: 'Addis Ababa, Ethiopia',
    type: 'Full-time',
    description: [
      'Promoted to lead educational initiatives in one of Africa\'s top coding academies.',
      'Mentored 15+ university students in Data Structures, Algorithms, and Software Development.',
      'Taught complex topics including graph theory, dynamic programming, and advanced Python.',
      'Led production-level projects that addressed local challenges, inspiring a culture of innovation.',
      'Fostered a rigorous technical environment that helped students land global job offers.'
    ],
    stack: ['Algorithms', 'Mentorship', 'Leadership', 'Real-World Projects']
  },
  {
    year: 'Jan 2023 – Jun 2024',
    title: 'Mobile Application Developer',
    company: 'A2SV | Africa to Silicon Valley',
    location: 'Addis Ababa, Ethiopia',
    type: 'Part-time',
    description: [
      'Worked on multiple Flutter-based projects tackling real-world challenges across Africa.',
      'Collaborated on both frontend and backend features using Flutter, Firebase, and Supabase.',
      'Assisted and mentored new interns, contributing to team growth and technical quality.',
      'Delivered mobile apps that combined UX best practices with high performance.'
    ],
    stack: ['Flutter', 'Firebase', 'Supabase', 'Dart']
  },
  {
    year: 'Feb 2023 – Mar 2024',
    title: 'Freelance Flutter Developer',
    company: 'Upwork',
    location: 'Addis Ababa, Ethiopia',
    type: 'Remote',
    description: [
      'Delivered 4 complete mobile applications for international clients, each tailored to their business needs.',
      'Focused on clean architecture, efficient backend integration, and smooth UI/UX design.',
      'Built full-stack apps using Flutter (frontend) and Firebase/Supabase (backend), plus Python for automation.',
      'Maintained high customer satisfaction by meeting deadlines and adapting to evolving requirements.'
    ],
    stack: ['Flutter', 'Firebase', 'Supabase', 'Python', 'Dart']
  },
  {
    year: 'Mar 2023 – Aug 2023',
    title: 'Software Engineering Intern',
    company: 'Eskalate',
    location: 'Addis Ababa, Ethiopia',
    type: 'Internship',
    description: [
      'Led the development of a ride-sharing mobile app from idea to MVP using Flutter.',
      'The project won first place among interns and earned a $2,000 USD award.',
      'Integrated Google Maps for real-time ride-matching and seamless navigation.',
      'The app was successfully launched on the Play Store and shows strong growth potential.',
      'Recognized as Best Performer of the Internship for leadership and technical excellence.'
    ],
    stack: ['Flutter', 'Dart', 'Google Maps API']
  }
];

export default function Experience() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -50 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      },
    },
  };

  return (
    <section className="py-20 bg-[#0D1117] text-white">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            Experience
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            My journey as a software developer
          </p>
        </motion.div>
        
        <motion.div
          ref={ref}
          className="max-w-4xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          {experiences.map((experience, index) => (
            <motion.div
              key={index}
              className="mb-16 relative pl-8"
              variants={itemVariants}
            >
              <div className="absolute -left-1 top-0 w-2 h-full bg-gradient-to-b from-blue-500 to-purple-500" />
              <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
              
              <motion.div
                className="bg-[#161B22] p-8 rounded-xl shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 border border-gray-800"
                whileHover={{ scale: 1.02, borderColor: '#3B82F6' }}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-blue-400 font-semibold text-sm tracking-wider">{experience.year}</span>
                  <span className="text-gray-400 text-sm">{experience.type}</span>
                </div>
                <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                  {experience.title}
                </h3>
                <h4 className="text-xl text-gray-400 mb-1">{experience.company}</h4>
                <p className="text-gray-500 text-sm mb-4">{experience.location}</p>
                
                <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                  {experience.description.map((point, idx) => (
                    <li key={idx} className="text-gray-300">{point}</li>
                  ))}
                </ul>
                
                <div className="flex flex-wrap gap-2">
                  {experience.stack.map((skill, skillIndex) => (
                    <span
                      key={skillIndex}
                      className="px-3 py-1 text-sm rounded-full bg-gray-800 text-gray-300 border border-gray-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
} 
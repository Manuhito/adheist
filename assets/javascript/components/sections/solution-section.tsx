'use client';
import React from 'react';
import { Layers, Share2, Wand2, LineChart } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { FeatureCard } from '@/components/ui/grid-feature-cards';
import Section from '@/components/section';

const features = [
	{
		title: 'Generate Unlimited Ad Variations',
		icon: Layers,
		description: 'Create 100+ versions from a single product URL. Test what works.',
	},
	{
		title: 'Works Everywhere',
		icon: Share2,
		description: 'Export to Facebook Ads, Instagram or Social Media.',
	},
	{
		title: 'No Design Skills Needed',
		icon: Wand2,
		description: 'AI handles the creative process. You handle the strategy.',
	},
	{
		title: 'Scale A/B Testing Faster',
		icon: LineChart,
		description: 'Create variants faster than ever.',
	},
];

export default function SolutionSection() {
	return (
		<Section
			title="Advanced Features"
			subtitle={
				<>
					Everything You Need for{" "}
					<span className="text-primary">Successful Ad Creation</span>
				</>
			}
			className="-mt-8"
		>
			<div className="mx-auto mt-16 w-full max-w-5xl space-y-8 px-4">

				<AnimatedContainer
					delay={0.4}
					className="grid grid-cols-1 divide-x divide-y divide-dashed border border-dashed sm:grid-cols-2"
				>
					{features.map((feature, i) => (
						<FeatureCard key={i} feature={feature} />
					))}
				</AnimatedContainer>
			</div>
		</Section>
	);
}

type ViewAnimationProps = {
	delay?: number;
	className?: React.ComponentProps<typeof motion.div>['className'];
	children: React.ReactNode;
};

function AnimatedContainer({ className, delay = 0.1, children }: ViewAnimationProps) {
	const shouldReduceMotion = useReducedMotion();

	if (shouldReduceMotion) {
		return children;
	}

	return (
		<motion.div
			initial={{ filter: 'blur(4px)', translateY: -8, opacity: 0 }}
			whileInView={{ filter: 'blur(0px)', translateY: 0, opacity: 1 }}
			viewport={{ once: true }}
			transition={{ delay, duration: 0.8 }}
			className={className}
		>
			{children}
		</motion.div>
	);
}

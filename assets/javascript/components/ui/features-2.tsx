"use client";
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Sparkles, Upload, Zap } from 'lucide-react'
import { ReactNode } from 'react'

export function Features() {
    return (
        <section>
            <div className="@container mx-auto max-w-5xl px-6">
                <div className="text-center">
                    <h2 className="text-balance text-4xl font-semibold lg:text-5xl">Creating Ads with <span className="text-primary">AdHeist</span> is Simple</h2>
                    <p className="mt-4">Our platform makes ad creation effortless and effective</p>
                </div>
                <div className="mx-auto mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 *:text-center md:mt-16">
                    <Card className="group border-0 bg-neutral-50 dark:bg-neutral-900 shadow-none">
                        <CardHeader className="pb-3">
                            <CardDecorator>
                                <Upload className="size-6 text-primary" aria-hidden />
                            </CardDecorator>
                            <h3 className="mt-6 font-medium">Find Winning Ad Ideas</h3>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm">Discover high-performing ads from competitors and industry leaders with the highest ROI.</p>
                        </CardContent>
                    </Card>

                    <Card className="group border-0 bg-neutral-50 dark:bg-neutral-900 shadow-none">
                        <CardHeader className="pb-3">
                            <CardDecorator>
                                <Zap className="size-6 text-primary" aria-hidden />
                            </CardDecorator>
                            <h3 className="mt-6 font-medium">Create Ads Automatically</h3>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm">Turn winning ideas into your own ads with just a few clicks - 95% done for you.</p>
                        </CardContent>
                    </Card>

                    <Card className="group border-0 bg-neutral-50 dark:bg-neutral-900 shadow-none">
                        <CardHeader className="pb-3">
                            <CardDecorator>
                                <Sparkles className="size-6 text-primary" aria-hidden />
                            </CardDecorator>
                            <h3 className="mt-6 font-medium">Polish and Launch</h3>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm">Quickly adjust with AI tools and launch your new high-converting ads.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>
    )
}

const CardDecorator = ({ children }: { children: ReactNode }) => (
    <div aria-hidden className="relative mx-auto size-36 [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]">
        <div className="absolute inset-0 [--border:black] dark:[--border:white] bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:24px_24px] opacity-10"/>
        <div className="bg-background absolute inset-0 m-auto flex size-12 items-center justify-center border-t border-l">{children}</div>
    </div>
)

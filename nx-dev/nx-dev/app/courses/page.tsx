import React from 'react';
import { DefaultLayout } from '@nx/nx-dev/ui-common';
import { CourseOverview, CourseHero } from '@nx/nx-dev/ui-video-courses';
import { coursesApi } from '../../lib/courses.api';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nx Video Courses',
  description:
    'Explore our comprehensive video courses to master Nx and boost your development skills.',
  openGraph: {
    url: 'https://nx.dev/courses',
    title: 'Nx Video Courses',
    description:
      'Explore our comprehensive video courses to master Nx and boost your development skills.',
    images: [
      {
        url: 'https://nx.dev/socials/nx-courses-media.png',
        width: 800,
        height: 421,
        alt: 'Nx Video Courses: Master Nx through comprehensive tutorials',
        type: 'image/jpeg',
      },
    ],
    siteName: 'NxDev',
    type: 'website',
  },
};

export default async function CoursesPage(): Promise<JSX.Element> {
  const courses = await coursesApi.getAllCourses();

  return (
    <DefaultLayout>
      <CourseHero />
      <div className="mt-8">
        <CourseOverview courses={courses} />
      </div>
    </DefaultLayout>
  );
}

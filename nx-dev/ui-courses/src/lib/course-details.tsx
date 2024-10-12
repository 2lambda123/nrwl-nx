import { Course } from '@nx/nx-dev/data-access-courses';
import { ButtonLink } from '@nx/nx-dev/ui-common';
import { renderMarkdown } from '@nx/nx-dev/ui-markdoc';
import Link from 'next/link';
import Image from 'next/image';
import { BlogAuthors } from '@nx/nx-dev/ui-blog';
import type { BlogAuthor } from '@nx/nx-dev/data-access-documents/node-only';
import { LessonsList } from './lessons-list';

export interface CourseDetailsProps {
  course: Course;
}

export function CourseDetails({ course }: CourseDetailsProps) {
  const { node } = renderMarkdown(course.content, {
    filePath: course.filePath ?? '',
    headingClass: 'scroll-mt-20',
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-4">
        <Link
          href="/courses"
          className="group inline-flex items-center text-sm leading-6 text-slate-950 dark:text-white"
          prefetch={false}
        >
          <span
            aria-hidden="true"
            className="mr-1 inline-block transition group-hover:-translate-x-1"
          >
            ←
          </span>
          All courses
        </Link>
      </div>

      <div className="mb-8 flex items-center justify-between">
        <div className="course-title-section">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-5xl dark:text-white">
            {course.title}
          </h1>
          <div className="mt-4 flex items-center gap-x-2">
            <BlogAuthors authors={course.authors as BlogAuthor[]} />
            <span className="text-sm">{course.authors[0].name}</span>
          </div>
        </div>
        {/* <div className="course-icon">
          <Image
            src={`/documentation/courses/images/${course.id}.png`}
            alt={`${course.title} icon`}
            width={96}
            height={96}
            className="h-24 w-24 object-cover"
          />
        </div> */}
      </div>

      <div className="mt-10 flex items-center gap-x-6">
        {course.lessons && course.lessons.length > 0 && (
          <ButtonLink
            href={`/courses/${course.id}/${course.lessons[0].id}`}
            title="Start the course"
            variant="primary"
            size="default"
          >
            Start Learning
          </ButtonLink>
        )}
        {course.repository && (
          <ButtonLink
            href={course.repository}
            title="Code"
            variant="contrast"
            size="default"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mr-2 inline-block h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 0C4.477 0 0 4.477 0 10c0 4.419 2.865 8.17 6.839 9.49.5.09.686-.217.686-.484 0-.239-.009-.868-.014-1.7-2.787.605-3.371-1.338-3.371-1.338-.455-1.153-1.112-1.46-1.112-1.46-.91-.622.069-.61.069-.61 1.005.071 1.532 1.033 1.532 1.033.891 1.527 2.34 1.085 2.91.828.091-.645.35-1.085.636-1.334-2.23-.253-4.566-1.115-4.566-4.953 0-1.095.39-1.988 1.033-2.684-.104-.253-.448-1.27.098-2.647 0 0 .84-.269 2.75 1.024.8-.223 1.654-.334 2.504-.338.848.004 1.701.115 2.504.338 1.91-1.293 2.748-1.024 2.748-1.024.548 1.377.202 2.394.1 2.647.644.696 1.032 1.589 1.032 2.684 0 3.848-2.34 4.697-4.573 4.946.36.31.681.922.681 1.853 0 1.338-.012 2.414-.012 2.74 0 .269.181.581.694.482C17.138 18.168 20 14.419 20 10 20 4.477 15.523 0 10 0z"
                clipRule="evenodd"
              />
            </svg>
            Code
          </ButtonLink>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-8 md:flex-row">
        <div className="course-description md:w-2/3">
          <div className="prose prose-lg prose-slate dark:prose-invert w-full max-w-none 2xl:max-w-4xl">
            {node}
          </div>
        </div>

        {course.lessons && course.lessons.length > 0 && (
          <div className="course-lessons md:w-1/3">
            <LessonsList course={course} />
          </div>
        )}
      </div>
    </div>
  );
}

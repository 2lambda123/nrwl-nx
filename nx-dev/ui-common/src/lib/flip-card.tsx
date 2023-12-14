import { ChevronDoubleDownIcon } from '@heroicons/react/24/outline';
import cx from 'classnames';
import { ReactNode, createContext, useState } from 'react';
import { computeEmbedURL } from './youtube.component';

const FlipCardContext = createContext({ day: 0, onClick: () => {} });

export function FlipCard({
  isFlippable,
  isFlipped,
  day,
  onFlip,
  onClick,
  children,
}: {
  isFlippable?: boolean;
  isFlipped?: boolean;
  onFlip?: (day: number, isFlipped: boolean) => void;
  day: number;
  onClick: () => void;
  children: ReactNode;
}) {
  const [flipped, setFlipped] = useState(isFlipped);

  return (
    <FlipCardContext.Provider value={{ day, onClick }}>
      <a
        onClick={(event) => {
          if (isFlippable && !flipped) {
            setFlipped(true);
            onFlip && onFlip(day, true);
            event.preventDefault();
          } else {
            onClick();
          }
        }}
        className={cx(
          'block group perspective',
          isFlippable ? 'cursor-pointer' : 'cursor-default'
        )}
      >
        <div
          className={cx(
            'relative preserve-3d transition w-full h-full duration-200 aspect-[16/9] content-center rounded-lg border-2 shadow-sm focus-within:ring-offset-2 bg-white/40 dark:bg-slate-800/60',
            flipped ? 'my-rotate-y-180 bg-white dark:bg-slate-800' : '',
            isFlippable
              ? flipped
                ? 'border-blue-500 dark:border-blue-500/40'
                : 'border-blue-500 dark:border-blue-500/40 hover:[transform:rotateY(10deg)]'
              : 'border-1 border-slate-300 dark:border-slate-800'
          )}
        >
          <FlipCardFront>{day}</FlipCardFront>
          {children}
        </div>
      </a>
    </FlipCardContext.Provider>
  );
}

export function FlipCardFront({ children }: { children: ReactNode }) {
  return (
    <div className="absolute backface-hidden w-full h-full flex flex-col justify-center items-center text-center text-3xl">
      {children}
    </div>
  );
}

export function FlipCardBack({ children }: { children: ReactNode }) {
  return (
    <FlipCardContext.Consumer>
      {({ day }) => (
        <div className="absolute my-rotate-y-180 backface-hidden w-full h-full overflow-hidden rounded-md dark:text-slate-100 text-slate-900 text-3xl dark:bg-white/10 bg-slate-800/20 flex justify-center items-center">
          <span className="absolute top-0 left-0 pt-2 pl-3 text-base">
            {day}
          </span>
          <div className="px-2 text-center text-sm sm:text-sm md:text-sm lg:text-lg">
            {children}
          </div>
          <div className="text-center opacity-0 group-hover:opacity-100 transition pb-2 absolute w-full bottom-0">
            <span className="block w-5 h-5 m-auto">
              <ChevronDoubleDownIcon></ChevronDoubleDownIcon>
            </span>
          </div>
        </div>
      )}
    </FlipCardContext.Consumer>
  );
}

export function FlipCardBackYoutube({
  title,
  src,
}: {
  title: string;
  src: string;
}) {
  return (
    <FlipCardContext.Consumer>
      {({ day, onClick }) => (
        <div className="absolute my-rotate-y-180 backface-hidden w-full h-full overflow-hidden rounded-md dark:text-slate-100 text-slate-900 text-3xl bg-black">
          <span className="absolute pt-2 pl-3 text-base text-slate-100">
            {day}
          </span>
          <div
            className="absolute top-0 bottom-0 left-0 right-0"
            onClick={onClick}
          ></div>
          <div className="text-center">
            {' '}
            {/* Center alignment applied to the container */}
            <iframe
              src={computeEmbedURL(src)}
              title={title}
              width="100%"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              loading="lazy"
              className="shadow-lg mb-1"
            />
          </div>
          <div className="text-center text-slate-100 opacity-0 group-hover:opacity-100 transition pb-2 absolute w-full bottom-0">
            <span className="block w-5 h-5 m-auto">
              <ChevronDoubleDownIcon></ChevronDoubleDownIcon>
            </span>
          </div>
        </div>
      )}
    </FlipCardContext.Consumer>
  );
}

import { AnnouncementBanner, Footer, Header } from '@nrwl/nx-dev/ui-common';
import {
  MigrationsAndCodeGeneration,
  ExtensibleAndIntegrated,
  GettingStarted,
  Hero,
  LogoCloud,
  Migrate,
  Newsletter,
  NxIsFast,
  NxStatistics,
  Testimonials,
} from '@nrwl/nx-dev/ui-home';
import { NextSeo } from 'next-seo';

export default function Index(): JSX.Element {
  return (
    <>
      <NextSeo
        title="Nx: Smart, Fast and Extensible Build System"
        description="Next generation build system with first class monorepo support and powerful integrations."
        openGraph={{
          url: 'https://nx.dev',
          title: 'Nx: Smart, Fast and Extensible Build System',
          description:
            'Nx is a smart, fast and extensible build system which comes with first class monorepo support and powerful integrations.',
          images: [
            {
              url: 'https://nx.dev/images/nx-media.jpg',
              width: 800,
              height: 400,
              alt: 'Nx: Smart, Fast and Extensible Build System',
              type: 'image/jpeg',
            },
          ],
          site_name: 'Nx',
          type: 'website',
        }}
      />
      <h1 className="sr-only">Next generation monorepo tool</h1>
      <AnnouncementBanner />
      <Header />
      <main id="main" role="main">
        <div className="w-full">
          {/*HERO COMPONENT*/}
          <Hero />
          {/*LOGO CLOUD*/}
          <LogoCloud />
          {/*NX STATISTICS*/}
          <NxStatistics />
          {/*NX IS FAST*/}
          <NxIsFast />
          {/*MIGRATE*/}
          <Migrate />
          {/*EXTENSIBLE & INTEGRATED*/}
          <ExtensibleAndIntegrated />
          {/*AFFECTED & CODE GENERATION*/}
          <MigrationsAndCodeGeneration />
          {/*GETTING STARTED*/}
          <GettingStarted />
          {/*TESTIMONIALS*/}
          <Testimonials />
          {/*NEWSLETTER*/}
          <Newsletter />
        </div>
      </main>
      <Footer />
    </>
  );
}

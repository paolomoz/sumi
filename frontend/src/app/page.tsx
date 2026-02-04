import { HomeHero } from "@/components/home/home-hero";
import { ShowcaseGrid } from "@/components/home/showcase-grid";

export default function Home() {
  return (
    <div className="flex flex-col items-center min-h-full px-4 py-12">
      {/* Hero + Input */}
      <div className="w-full max-w-2xl space-y-6 mb-12">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight">
            What can I create for you?
          </h1>
          <p className="text-muted text-base">
            Describe a topic and we&apos;ll generate a beautiful infographic with 20
            layouts and 19 artistic styles.
          </p>
        </div>

        <HomeHero />
      </div>

      {/* Showcase grid */}
      <div className="w-full max-w-7xl">
        <h2 className="text-xs font-medium text-muted uppercase tracking-wider mb-6">
          Featured Creations
        </h2>
        <ShowcaseGrid />
      </div>
    </div>
  );
}

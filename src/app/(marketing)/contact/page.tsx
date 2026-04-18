export default function ContactPage() {
  return (
    <section className="section-padding">
      <div className="container-max max-w-3xl">
        <h1 className="font-heading text-4xl font-bold text-espresso sm:text-5xl">
          Get in Touch
        </h1>

        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          <div>
            <h2 className="font-heading text-xl font-semibold text-espresso">
              Visit Us
            </h2>
            <address className="mt-2 not-italic text-mocha">
              <p>4315 FM 2147</p>
              <p>Horseshoe Bay, TX 78657</p>
            </address>

            <h2 className="mt-6 font-heading text-xl font-semibold text-espresso">
              Contact
            </h2>
            <div className="mt-2 space-y-1 text-mocha">
              <p>
                <a href="tel:+15122196781" className="hover:text-espresso transition-colors">
                  (512) 219-6781
                </a>
              </p>
              <p>
                <a href="mailto:kyndacoffee@gmail.com" className="hover:text-espresso transition-colors">
                  kyndacoffee@gmail.com
                </a>
              </p>
            </div>

            <h2 className="mt-6 font-heading text-xl font-semibold text-espresso">
              Hours
            </h2>
            <div className="mt-2 text-sm text-mocha">
              <p>Monday – Friday: 6:30 AM – 5:00 PM</p>
              <p>Saturday – Sunday: 7:00 AM – 5:00 PM</p>
              <p className="mt-1 text-xs italic">Hours may vary on holidays</p>
            </div>
          </div>

          <div>
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="mb-2 block text-sm font-medium text-espresso">
                  Name
                </label>
                <input type="text" className="input-field" placeholder="Your name" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-espresso">
                  Email
                </label>
                <input type="email" className="input-field" placeholder="your@email.com" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-espresso">
                  Message
                </label>
                <textarea rows={4} className="input-field" placeholder="How can we help?" />
              </div>
              <button type="submit" className="btn-primary">
                Send Message
              </button>
            </form>
          </div>
        </div>

        {/* Map placeholder */}
        <div className="mt-12 aspect-video rounded-2xl bg-latte/20 flex items-center justify-center">
          <p className="text-mocha text-sm">Map embed coming soon</p>
        </div>
      </div>
    </section>
  );
}

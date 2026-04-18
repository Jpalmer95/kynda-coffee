export default function CateringPage() {
  return (
    <section className="section-padding">
      <div className="container-max max-w-3xl">
        <h1 className="font-heading text-4xl font-bold text-espresso sm:text-5xl">
          Cater Your Next Event
        </h1>
        <p className="mt-3 text-lg text-mocha">
          From corporate meetings to weddings, bring Kynda Coffee to your special occasion.
        </p>

        <form className="mt-12 space-y-6" action="#">{/**/}
          <div className="grid gap-6 sm:grid-cols-2">
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
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-espresso">
                Event Date
              </label>
              <input type="date" className="input-field" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-espresso">
                Estimated Guests
              </label>
              <input type="number" className="input-field" placeholder="50" />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-espresso">
              Tell us about your event
            </label>
            <textarea
              rows={5}
              className="input-field"
              placeholder="What kind of event? Any special requests?"
            />
          </div>

          <button type="submit" className="btn-primary">
            Request Quote
          </button>
        </form>
      </div>
    </section>
  );
}

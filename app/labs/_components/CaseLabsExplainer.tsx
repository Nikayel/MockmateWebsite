/**
 * The two prose sections below the labs on `/labs`.
 *
 * This is the page's ranking layer, and it is deliberately below the fold: it costs no attention
 * from a visitor who came to open a lab, and it is fully in the initial HTML for everyone else. It
 * replaces a section called "The interview rounds these labs rehearse", which said the same thing
 * the group headings in the grid already say, in different words, 700px away.
 *
 * A Server Component with no interactivity, two columns on a wide screen, full sentences rather than
 * bullets, because the query this answers ("what is a decomposition interview") is answered in
 * prose or not at all.
 *
 * ## The integrity sentence is not optional
 *
 * "They are original problems written in the same style, not leaked questions." Naming that a
 * company runs this FORMAT is factual and checkable. Implying we hold real questions from anyone's
 * loop would not be, and it is the kind of claim that is both untrue and legally exposed. Do not
 * remove that sentence, and do not soften it into something that reads as a wink.
 *
 * Every factual claim here is carried by an authored lab in the registry: the three Palantir round
 * types are the three Palantir labs' `whyThisCompany` copy, and the Stripe framing is that lab's.
 */

export function CaseLabsExplainer() {
  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <section aria-labelledby="what-is-a-decomposition-interview" className="flex flex-col gap-3">
        <h2
          id="what-is-a-decomposition-interview"
          className="text-lg font-semibold text-[var(--wb-text)] sm:text-xl"
        >
          What is a decomposition interview?
        </h2>
        <p className="text-sm leading-relaxed text-[var(--wb-text-secondary)]">
          A decomposition interview hands you a problem that is too vague to start coding on, and
          scores what you do before you start. You ask what &ldquo;best&rdquo; is supposed to mean.
          You name the entities the system actually has and find the bottleneck. You commit to a
          contract with named inputs and outputs, and you say what happens when the primary path is
          unavailable. Only then do you touch the codebase.
        </p>
        <p className="text-sm leading-relaxed text-[var(--wb-text-secondary)]">
          It is not a system design interview. You are not sizing a fleet or drawing a diagram of
          services nobody will build. A decomposition round ends in running code inside a repository
          somebody else wrote, where the design you argued for has to survive contact with the files
          you are allowed to change and a test suite that either passes or does not.
        </p>
      </section>

      <section aria-labelledby="who-interviews-this-way" className="flex flex-col gap-3">
        <h2
          id="who-interviews-this-way"
          className="text-lg font-semibold text-[var(--wb-text)] sm:text-xl"
        >
          Who interviews this way
        </h2>
        <p className="text-sm leading-relaxed text-[var(--wb-text-secondary)]">
          Palantir&apos;s forward-deployed engineering loop is the clearest example. It runs a
          decomposition round on a vague operational problem, a re-engineering round on a codebase
          you did not write, and a learning round on an API you have never seen and almost no
          documentation for. Stripe runs the same shape against payments-grade correctness, where
          the hard part is at-least-once delivery and event ordering rather than the algorithm.
        </p>
        <p className="text-sm leading-relaxed text-[var(--wb-text-secondary)]">
          These labs are modeled on that shape. They are original problems written in the same
          style, not leaked questions. Each lab also names the rounds of that company&apos;s loop it
          does not cover and where to prepare those, because finishing one lab is not the same as
          being ready for the interview.
        </p>
      </section>
    </div>
  )
}

export const getInitialInterviewerMessage = (
  title: string,
  difficulty: string,
  problemType: string
) => {
  if (problemType === "BUG FIX") {
    return `Hey, I'm Sable, your interviewer for this session. Today we're working on **${title}**, a ${difficulty} debugging incident.

Start by reproducing the failure and inspecting the relevant files. Once you have a hypothesis, walk me through the evidence behind it.`
  }

  return `Hey, I'm Sable, your interviewer for this session. Today we're working on **${title}**, a ${difficulty} ${problemType} problem.

Take a moment to read through the problem on the left. Let me know if you have any questions about the requirements before we dive in.`
}

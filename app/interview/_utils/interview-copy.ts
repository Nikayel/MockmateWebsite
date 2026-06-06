export const getInitialInterviewerMessage = (
  title: string,
  difficulty: string,
  problemType: string
) =>
  `Hey, I'm Sable, your interviewer for this session. Today we're working on **${title}**, a ${difficulty} ${problemType} problem.

Take a moment to read through the problem on the left. Let me know if you have any questions about the requirements before we dive in.`

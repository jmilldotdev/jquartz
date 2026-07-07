---
tags:
aliases:
related:
publish: true
created-on: '[[2025-09-07]]'
---

Like most typical AI agents, we call the model in a loop. The idea behind an alloy is simple: instead of always calling the same model, sometimes call one and sometimes the other.

The trick is that you still keep to a single chat thread with one user and a single assistant. So while the true origin of the assistant messages in the conversation alternates, the models are not aware of each other. Whatever the other model said, they think it was said by them.

So in the first round, you might call Sonnet for an action to get started, with a prompt like this:

Let’s say it tells you to use curl. You do that and gather the output to present to the model. So now you call Gemini with a prompt like this:

Gemini might tell you to log in with the admin credentials, and you do that, and then you present the result to Sonnet:

Some of the messages Sonnet believes it wrote were actually authored by Gemini, and vice versa.

In our implementation, we actually make the model choice randomly for greater variation, but you could also alternate or experiment with more complex strategies.

The key advantage of mixing the two models into an alloy is that:

you keep the total number of model calls the same, but still
you give each model the chance to contribute its strengths to the solution.
In a situation where a couple of brilliant ideas are interspersed with workhorse like follow-up actions, this is a great way to combine the strengths of different models.
[XBOW - Agents Built From Alloys](https://xbow.com/blog/alloy-agents)
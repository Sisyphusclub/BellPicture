'use client';

import type { KeyboardEvent, RefObject } from 'react';
import { useState } from 'react';
import type { AgentChatComposerHandle } from './composer';
import { filterSkills } from './skills';
import type { AgentChatSkill } from './types';

export type UseSkillCommandParams = {
  skills: readonly AgentChatSkill[];
  composerRef: RefObject<AgentChatComposerHandle | null>;
};

export function useSkillCommand({ skills, composerRef }: UseSkillCommandParams) {
  const [query, setQuery] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const options = query === null ? [] : filterSkills(skills, query);
  const visible = query !== null && skills.length > 0;

  function onQueryChange(nextQuery: string | null) {
    setQuery(skills.length > 0 ? nextQuery : null);
    setActiveIndex(0);
  }

  function select(skillId: string) {
    const skill = skills.find((entry) => entry.id === skillId);
    if (skill) {
      composerRef.current?.insertSkill(skill);
    }
    setQuery(null);
    setActiveIndex(0);
  }

  function onNavKeyDown(event: KeyboardEvent<HTMLDivElement>): boolean {
    if (query === null) {
      return false;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setQuery(null);
      return true;
    }

    if (options.length === 0) {
      return false;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % options.length);
      return true;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + options.length) % options.length);
      return true;
    }

    if (event.key === 'Enter' && options[activeIndex]) {
      event.preventDefault();
      select(options[activeIndex].id);
      return true;
    }

    return false;
  }

  return {
    activeIndex,
    options,
    visible,
    onNavKeyDown,
    onQueryChange,
    select,
    setActiveIndex,
  };
}

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { BookCard } from '@/components/BookCard';
import { ExperienceProvider } from '@/state/experience';
import type { Book } from '@/domain/types';

const example: Book = {
  id: 'book-1',
  title: 'Accessible Stories',
  author: 'Example Author',
  duration: 3600,
  audioUrl: 'https://example.invalid/audio.mp3',
  source: 'librivox',
};

describe('BookCard', () => {
  it('exposes one meaningful accessible control name', () => {
    const onPress = jest.fn();
    const screen = render(
      <ExperienceProvider>
        <BookCard book={example} onPress={onPress} />
      </ExperienceProvider>,
    );

    const control = screen.getByRole('button', { name: 'Accessible Stories by Example Author' });
    fireEvent.press(control);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

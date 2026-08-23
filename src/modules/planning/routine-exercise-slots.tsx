export type RoutineExerciseSlotOption = {
  id: string;
  title: string;
  versionNumber: number;
};

type Props = {
  idPrefix: string;
  options: RoutineExerciseSlotOption[];
  selectedIds?: string[];
  error?: string;
};

export function RoutineExerciseSlots({
  idPrefix,
  options,
  selectedIds = [],
  error,
}: Props) {
  const helpId = `${idPrefix}-exercise-help`;
  const errorId = `${idPrefix}-exercise-error`;

  return (
    <fieldset
      className="choice-group"
      aria-describedby={error ? `${helpId} ${errorId}` : helpId}
    >
      <legend>Exercises in routine order</legend>
      <p className="field-help" id={helpId}>
        Choose up to 12 approved exercise versions. Slot 1 is performed first.
        Leave unused slots empty and choose each exercise only once.
      </p>

      {Array.from({ length: 12 }, (_, index) => {
        const inputId = `${idPrefix}-exercise-${index + 1}`;

        return (
          <div className="field" key={inputId}>
            <label htmlFor={inputId}>Exercise {index + 1}</label>
            <select
              id={inputId}
              name="exerciseVersionId"
              defaultValue={selectedIds[index] ?? ""}
            >
              <option value="">No exercise</option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.title} — version {option.versionNumber}
                </option>
              ))}
            </select>
          </div>
        );
      })}

      {error ? (
        <p className="field-error" id={errorId}>
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

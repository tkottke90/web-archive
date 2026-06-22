import { useSignal, useSignalEffect } from '@preact/signals';
import { Fragment } from 'preact';
import { createPortal } from 'preact/compat';
import { DrawerLayout } from '../../components/Layouts/DrawerLayout';
import { getTags, loadedTags, updateTag } from '../../services/tags.service';
import { TagDTO } from '@web-archive/shared';
import { getPortalContainer } from '../../utilities/dom.utils';

const portal = getPortalContainer('modals');

/**
 * Normalize a hex color string to 6 digits for use with <input type="color">.
 * Expands 3-digit hex (e.g. "222" → "222222") by doubling each character.
 */
function normalizeHex(hex: string): string {
  if (hex.length === 3) {
    return hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  return hex;
}

export function TagsPage() {
  const drawerState = useSignal(false);
  const editingTag = useSignal<TagDTO | null>(null);

  useSignalEffect(() => {
    if (loadedTags.value.length === 0) {
      getTags().then((result) => {
        loadedTags.value = result;
      });
    }
  });

  return (
    <DrawerLayout openDrawer={drawerState}>
      <div class="bg-cloud-100 border rounded border-cloud-400 shadow-md p-4">
        <h2 className="text-2xl">Tags</h2>
        <br />
        {loadedTags.value.length === 0 ? (
          <p class="text-cloud-600">No tags found.</p>
        ) : (
          <table class="w-full text-left">
            <thead>
              <tr class="border-b border-cloud-400">
                <th>Name</th>
                <th>Color</th>
                <th>Preview</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadedTags.value.map((tag) => (
                <tr
                  key={tag.id}
                  class="border-b border-cloud-200 hover:bg-cloud-200"
                >
                  <td class="font-bold">{tag.label}</td>
                  <td>
                    <span
                      class="inline-block w-6 h-6 rounded border border-cloud-400"
                      style={{ backgroundColor: `#${tag.color}` }}
                    />
                  </td>
                  <td>
                    <span
                      class="rounded-full px-2 py-1 text-sm font-bold"
                      style={{
                        backgroundColor: `#${tag.color}`,
                        color: `#${tag.textColor}`
                      }}
                    >
                      {tag.label}
                    </span>
                  </td>
                  <td class="text-right">
                    <button
                      class="px-3 py-1 text-sm bg-burnt-500 text-slate-200 rounded hover:brightness-110"
                      onClick={() => {
                        editingTag.value = { ...tag };
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editingTag.value &&
        createPortal(
          <EditTagModal
            tag={editingTag.value}
            onClose={() => {
              editingTag.value = null;
            }}
            onSave={async (updates) => {
              if (editingTag.value) {
                await updateTag(editingTag.value.id, updates);
                editingTag.value = null;
              }
            }}
          />,
          portal
        )}
    </DrawerLayout>
  );
}

interface EditTagModalProps {
  tag: TagDTO;
  onClose: () => void;
  onSave: (updates: {
    label?: string;
    color?: string;
    textColor?: string;
  }) => Promise<void>;
}

function EditTagModal({ tag, onClose, onSave }: EditTagModalProps) {
  const label = useSignal(tag.label);
  const color = useSignal(normalizeHex(tag.color));
  const textColor = useSignal(normalizeHex(tag.textColor));
  const saving = useSignal(false);

  const handleSave = async () => {
    saving.value = true;
    try {
      await onSave({
        label: label.value,
        color: color.value,
        textColor: textColor.value
      });
    } finally {
      saving.value = false;
    }
  };

  return (
    <Fragment>
      <div
        class="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />
      <div class="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div
          class="bg-white rounded shadow-lg p-6 min-w-[350px] max-w-[500px] pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 class="text-xl font-bold mb-4">Edit Tag</h3>

          <div class="flex flex-col gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-600 mb-1">
                Display Name
              </label>
              <input
                type="text"
                class="w-full px-2 py-1 border border-cloud-400 rounded bg-white text-sm"
                value={label.value}
                onInput={(e) => {
                  label.value = (e.target as HTMLInputElement).value;
                }}
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-600 mb-1">
                Color
              </label>
              <div class="flex items-center gap-2">
                <input
                  type="color"
                  class="w-10 h-10 p-0 border border-cloud-400 rounded cursor-pointer"
                  value={`#${color.value}`}
                  onInput={(e) => {
                    color.value = (
                      e.target as HTMLInputElement
                    ).value.replace('#', '');
                  }}
                />
                <input
                  type="text"
                  class="flex-1 px-2 py-1 border border-cloud-400 rounded bg-white text-sm font-mono"
                  value={color.value}
                  onInput={(e) => {
                    color.value = (e.target as HTMLInputElement).value.replace(
                      '#',
                      ''
                    );
                  }}
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-600 mb-1">
                Text Color
              </label>
              <div class="flex items-center gap-2">
                <input
                  type="color"
                  class="w-10 h-10 p-0 border border-cloud-400 rounded cursor-pointer"
                  value={`#${textColor.value}`}
                  onInput={(e) => {
                    textColor.value = (
                      e.target as HTMLInputElement
                    ).value.replace('#', '');
                  }}
                />
                <input
                  type="text"
                  class="flex-1 px-2 py-1 border border-cloud-400 rounded bg-white text-sm font-mono"
                  value={textColor.value}
                  onInput={(e) => {
                    textColor.value = (
                      e.target as HTMLInputElement
                    ).value.replace('#', '');
                  }}
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-600 mb-1">
                Preview
              </label>
              <span
                class="rounded-full px-3 py-1 font-bold text-sm inline-block"
                style={{
                  backgroundColor: `#${color.value}`,
                  color: `#${textColor.value}`
                }}
              >
                {label.value}
              </span>
            </div>
          </div>

          <div class="flex justify-end gap-2 mt-6">
            <button
              class="px-3 py-1 text-sm border border-cloud-400 rounded hover:bg-cloud-200"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              class="px-3 py-1 text-sm bg-burnt-500 text-slate-200 rounded hover:brightness-110"
              disabled={saving.value}
              onClick={handleSave}
            >
              {saving.value ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </Fragment>
  );
}

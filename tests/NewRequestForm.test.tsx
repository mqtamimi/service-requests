import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NewRequestForm } from "../src/components/portal/NewRequestForm";

// Mock tRPC mutation
const mockMutate = vi.fn();
vi.mock("../src/trpc/react", () => ({
  api: {
    serviceRequests: {
      create: {
        useMutation: () => ({
          mutate: mockMutate,
          isPending: false,
          error: null,
        }),
      },
    },
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("NewRequestForm", () => {
  it("renders all required fields", () => {
    render(<NewRequestForm />);
    expect(screen.getByLabelText(/request type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit request/i })).toBeInTheDocument();
  });

  it("submit button is disabled when description is too short", () => {
    render(<NewRequestForm />);
    const btn = screen.getByRole("button", { name: /submit request/i });
    // description starts empty — shorter than 10 chars
    expect(btn).toBeDisabled();
  });

  it("submit button is enabled once description is long enough", async () => {
    render(<NewRequestForm />);
    const textarea = screen.getByLabelText(/description/i);
    fireEvent.change(textarea, { target: { value: "This is a valid description." } });
    const btn = screen.getByRole("button", { name: /submit request/i });
    expect(btn).not.toBeDisabled();
  });

  it("calls create mutation with correct values on submit", async () => {
    render(<NewRequestForm />);
    const textarea = screen.getByLabelText(/description/i);
    fireEvent.change(textarea, { target: { value: "My service is down urgently." } });

    const btn = screen.getByRole("button", { name: /submit request/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({
        type: "other",
        priority: "medium",
        description: "My service is down urgently.",
      });
    });
  });
});
